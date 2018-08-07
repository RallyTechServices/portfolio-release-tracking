Ext.define("CArABU.technicalservices.app.PortfolioReleaseTrackingBoard", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new CArABU.technicalservices.Logger(),
    defaults: { margin: 10 },

    integrationHeaders : {
        name : "CArABU.technicalservices.app.TSPortfolioReleaseTrackingBoard"
    },
    config: {
       defaultSettings: {
         usePoints: true
       }
    },
    style: 'z-index:0',
    featureModel: "PortfolioItem/Feature",

    launch: function() {

        if (!this._validate()){
           return;
        }

        var release = this.getContext().getTimeboxScope().getRecord();
         this.on('resize',this._resizeDependents, this);
         this._fetchIterations(release).then({
            success: this._initializeApp,
            failure: this._showErrorNotification,
            scope: this
         });

    },
    _resizeDependents: function(){
          this.toggleDependencies(this.getShowDependencies())
    },
    _validate: function(){
        if (!this.getContext().getTimeboxScope() || this.getContext().getTimeboxScope().getType() != 'release'){
            this._addAppMessage("This app is intended for a Release scoped dashboard.  Please use the Edit Page... menu item to set the dashboard for a Release filter.");
            return false;
        }

        if (!this.getContext().getTimeboxScope().getRecord()){
            this._addAppMessage("Please select a Release from the dashboard scope.");
            return false;
        }

        return true;
    },

    _fetchIterations: function(release){
        var deferred = Ext.create('Deft.Deferred');

          Ext.create('Rally.data.wsapi.Store',{
             model: 'Iteration',
             fetch: ['Name','StartDate','EndDate'],
             limit: 'Infinity',
             filters: [{
                      property: 'StartDate',
                      operator: '<',
                      value: release.get('ReleaseDate')
                  },{
                    property: 'EndDate',
                    operator: '>',
                    value: release.get('ReleaseStartDate')
                  }],
             sorters: [{
                property: 'StartDate',
                direction: 'ASC'
             }],
             context: {
                projectScopeDown: false,
                projectScopeUp: false,
             }
          }).load({
              scope: this,
              callback: function(records, operation,success){
                  if (success && records.length > 0){
                     deferred.resolve(_.map(records, function(r){ return r.getData(); }));
                  } else {
                     if (success){
                       deferred.reject("No iterations found for the selected Release in the currently scoped project.");
                     } else {
                       deferred.reject("Error loading Iterations: " + operation.error.errors.join('<br/>'));
                     }
                  }
              }
          });

        return deferred.promise;
    },

    getPortfolioItemName: function(){
       return this.featureModel && this.featureModel.split('/').length > 1 && this.featureModel.split('/')[1];
    },
    _showErrorNotification: function(message){
       Rally.ui.notify.Notifier.showError({
          message: message,
          allowHTML: true
       });
    },
    _addAppMessage: function(message){
        this.removeAll();
        this.add({
           xtype: 'container',
           html: Ext.String.format('<div class="no-data-container"><div class="secondary-message">{0}</div></div>',message)
        });
    },
    toggleDependencies2: function(board){
      this.logger.log('toggleDependencies', board);

      if (this.down('#dependencies')){
          this.down('#dependencies').destroy();
      }
      if (!board){
         return;
      }

      // if (!this.down('#trackingboard')){
      //    return;
      // }

      // board = this.down('#trackingbboard');

      var coords = {};
      var boardX = board.getX(),
          boardY = board.getY(),
          items = [];

      var xOffset = -board.getX() - board.getEl().getMargin().left;
      var yOffset = -board.getY() - board.getEl().getMargin().top;
      var depHash = _.reduce(board.getCards(), function(h,cc){
          _.each(cc, function(c){
            if (c.getRecord().hasDependencies() && c.getRecord().get('FormattedID')){
                h[c.getRecord().get('FormattedID')] = c;
            }
          });
         return h;
      },{});

      _.each(board.getCards(), function(cs){
         _.each(cs, function(c){
          var dep = c.getRecord().get('__dependency'),
              depParent = depHash[dep];
          var hs = c.getHotSpot();
          items.push({
              type: 'rect',
              width: hs.width,
              height: hs.height,
              x: hs.x+ xOffset,
              y: hs.y + yOffset ,
              fill: 'transparent',
              border: 'transparent',
              style: {
                cursor: 'pointer'
              },
              listeners: {
                 click: function(e,t){
                    c.fireEvent('fieldclick','Item');
                 },
                 mouseover: function(e,t){
                    c.fireEvent('fieldClick','Description');
                 },
                 mouseout: function(e,t){
                    c.fireEvent('mouseout');
                 },
                 scope: c
              }
          });
          if (dep && depParent){
               var p = c.getConnectorPoint(depParent.getX(), depParent.getY());
                var p2 = depParent.getConnectorPoint(c.getX(),c.getY());
               items.push({
                 type: "circle",
                 fill: 'red',
                 radius: 5,
                x: p.x + xOffset,
                y: p.y + yOffset

               });
               items.push({
                 type: "circle",
                 fill: 'red',
                 radius: 5,
                x: p2.x + xOffset,
                y: p2.y + yOffset

               });
               items.push({
                 type: "path",
                 path: Ext.String.format("M{0} {1} L {2} {3}",p.x+ xOffset,p.y+ yOffset,p2.x+ xOffset,p2.y+ yOffset),
                 fill: "transparent",
                 stroke: "red",
                 "stroke-width": "1"
               });
          }
          })
      });


      var drawComponent = Ext.create('Ext.draw.Component', {
          style: Ext.String.format('position:absolute; top:{0}px; left:{1}px;z-index:1', boardY,boardX),
          itemId: 'dependencies',
          id: 'dep',
          viewBox: false,
          margin: 10,
          height: board.getHeight(),
          width: board.getWidth(),
          items: items
      });
      this.add(drawComponent);

    },
    _initializeApp: function(iterations){
        this._addToggles();
        this._fetchRecords(iterations).then({
           success: function(results){
                this._buildBoard(iterations, results);
           },
           failure: this._showErrorNotification,
           scope: this
        });
    },
    _fetchRecords: function(iterations){
      var deferred = Ext.create('Deft.Deferred');

      var releaseName = this.getContext().getTimeboxScope().getRecord().get('Name'),
          featureName = this.getPortfolioItemName();

     this._fetchWsapiRecords(this._getFeatureConfig(releaseName, featureName)).then({
        success: function(records){
          var promises = [
            //this._fetchWsapiRecords(this._getFeatureConfig(releaseName, featureName)),
            this._fetchWsapiRecords(this._getDependentStoryConfig(releaseName, featureName, records)),
            this._fetchWsapiRecords(this._getOrphanStoryConfig(releaseName, featureName)),
            this._fetchWsapiRecords(this._getOrphanDefectConfig(releaseName))
          ];

          Deft.Promise.all(promises).then({
             success: function(results){
                //var records = this._buildArtifactRecords(results, iterations, featureName);
                results.unshift(records);
                deferred.resolve(results);
             },
             failure: function(msg){
                deferred.reject(msg);
             },
             scope: this
          });
        },
        failure: this._showErrorNotification,
        scope: this

     });


      return deferred.promise;
    },
    _buildBoard: function(iterations, results){
      this.logger.log('_buildBoard',results);
      if (results){
         this.results = results;
      }
      if (iterations){
          this.iterations = iterations;
      }
      this.toggleDependencies(false);

      var board = this.down('#trackingbboard');
      if (board){
        board.destroy();
      }
      this.dependencyMap = null;

      var b = this.add({
         xtype: 'portfolioreleasetrackingboard',
         itemId: 'trackingbboard',
         results: this.results,
         usePoints: this.getUsePoints(),
         showStories: this.getShowStories(),
         showDefects: this.getShowDefects(),
         showDependencies: this.getShowDependencies(),
         release: this.getContext().getTimeboxScope().getRecord().getData(),
         iterations: this.iterations,
         featureName: this.getPortfolioItemName(),
         context: this.getContext(),
         cardConfig: {
            usePoints: this.getUsePoints(),
            listeners: {
               showdependency: this._showCardDependency,
               scope: this
            }
         }
      });

      b.on('load', this._buildDependencyMap, this);

    },
    _showCardDependency: function(card){
        this.logger.log('card', card);
       this.toggleDependencies(true, card);
    },

    _buildDependencyMap: function(board){
        this.dependencyMap = Ext.create('CArABU.technicalservices.portfolioreleasetracking.DependencyMap',{
            board: board
        });
        this.toggleDependencies(this.getShowDependencies());

    },
    toggleDependencies: function(showDependencies, card){
      this.logger.log('toggleDependencies', showDependencies);

      if (this.down('#dependencies')){
          this.down('#dependencies').destroy();
      }

      var board = this.down('#trackingboard') || this.down('portfolioreleasetrackingboard');
      this.logger.log('board', board);
      if (!showDependencies || !this.down('portfolioreleasetrackingboard') || !this.dependencyMap){
          this.logger.log('Show dependencies == false OR there is no board rendered.')
         return;
      }

      var drawComponent = this.dependencyMap.getDependencyCanvas(board, card);
      if (drawComponent){
        this.add(drawComponent);
      }


    },

    _addToggles: function(){
        this.add({
          xtype: 'container',
          layout: 'hbox',
          margin: 5,
          style: 'z-index:10!important;',
          items: [{
            xtype: 'button',
            iconCls: 'icon-story',
            itemId: 'showStories',
            cls: 'primary rly-small',
            margin: 5,
            pressed: true,
            enableToggle: true,
            toggleHandler: this._toggleOptions,
            scope: this
          },{
            xtype: 'button',
            iconCls: 'icon-defect',
            itemId: 'showDefects',
            cls: 'primary rly-small',
            margin: 5,
            pressed: true,
            enableToggle: true,
            toggleHandler: this._toggleOptions,
            scope: this
          },{
            xtype: 'button',
            iconCls: 'icon-predecessor',
            itemId: 'showDependencies',
            cls: 'primary rly-small',
            margin: 5,
            pressed: true,
            enableToggle: true,
            toggleHandler: this._toggleOptions,
            scope: this
          }]
        });
    },

    _fetchWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                   deferred.reject("Error loading records: " + operation.error.errors.join(','));
                }
            }
        });
        return deferred.promise;
    },
    _getOrphanStoryConfig: function(releaseName, featureName){

      var fetch = ['Name','FormattedID','Project','Release','PlanEstimate','Iteration','EndDate','AcceptedDate','Parent'];

       return {
          model: "HierarchicalRequirement",
          fetch: fetch,
          filters: [{
              property: 'Release.Name',
              value: releaseName
          },{
              property: featureName,
              value: ""
          }],
          pageSize: 2000,
          limit: 'Infinity'
       };
    },
    _getOrphanDefectConfig: function(releaseName){

      var fields = ['Name','FormattedID','Project','Release','PlanEstimate','AcceptedDate','Iteration','EndDate','Parent'];

       return {
          model: "Defect",
          fetch: fields,
          filters: [{
             property: "Release.Name",
             value: releaseName
           }],
          limit: 'Infinity'
       };

    },
    _getDependentStoryConfig: function(releaseName, featureName, features){

      var fields = ['Name','FormattedID','Project','Parent','Release','PlanEstimate','AcceptedDate','Iteration','EndDate',featureName];
      var uniqueProjects = _.reduce(features, function(arr,f){
          if (!_.contains(arr, f.get('Project').ObjectID)){
            arr.push(f.get('Project').ObjectID);
          }
          return arr;
      },[]);
      var filters = _.map(features, function(f){

         return Rally.data.wsapi.Filter.and([{
           property: featureName + '.ObjectID',
           value: f.get('ObjectID')
         },{
           property: 'DirectChildrenCount',
          value: 0
         },{
           property: 'Project.ObjectID',
           operator: '!=',
           value: f.get('Project').ObjectID
         }]);
      });
      filters = Rally.data.wsapi.Filter.or(filters);


      return {
         model: "HierarchicalRequirement",
         fetch: fields,
         filters: filters,
         enablePostGet: true,
         context: {
            project: null
         },
         pageSize: 2000,
         limit: 'Infinity'
      };

        // var fields = ['Name','FormattedID','Project','Parent','Release','PlanEstimate','AcceptedDate','Iteration','EndDate',featureName];
        //
        // return {
        //    model: "HierarchicalRequirement",
        //    fetch: fields,
        //    filters: [{
        //      property: featureName + ".Release.Name",
        //      value: releaseName
        //    },{
        //      property: 'DirectChildrenCount',
        //      value: 0
        //    }],
        //    context: {
        //       project: null
        //    },
        //    pageSize: 2000,
        //    limit: 'Infinity'
        // };
    },
    _getFeatureConfig: function(releaseName, featureName){

        var fields = ['DisplayColor','Name','FormattedID','PlannedEndDate','Project','Release','LeafStoryPlanEstimateTotal','AcceptedLeafStoryPlanEstimateTotal','LeafStoryCount','AcceptedLeafStoryCount','Parent'];

        return {
           model: "PortfolioItem/" + featureName,
           fetch: fields,
           filters: [{
              property: "Release.Name",
              value: releaseName
            }],
            context: {
               project: this.getContext().getProject()._ref,
               projectScopeDown: this.getContext().getProjectScopeDown()
            },
           pageSize: 2000,
           limit: 'Infinity'
        };
    },

    _toggleOptions: function(btn, pressed){
        this.logger.log('_toggleOptions', btn.cls, btn.iconCls);

        if (pressed){
          btn.removeCls('secondary');
          btn.addCls('primary');
        } else {
          btn.removeCls('primary');
          btn.addCls('secondary');
        }

        //this._buildBoard();
        if (btn.itemId == "showDependencies"){
           this.toggleDependencies(pressed);
        } else {
           this._buildBoard();
        }

    },
    getShowStories: function(){
      return this.down('#showStories') && this.down('#showStories').pressed;
    },
    getShowDefects: function(){
      return this.down('#showDefects') && this.down('#showDefects').pressed;
    },
    getShowDependencies: function(){
      return this.down('#showDependencies') && this.down('#showDependencies').pressed;
    },
    getUsePoints: function(){
       return this.getSetting('usePoints') == "true" || this.getSetting('usePoints') === true;
    },
    getSettingsFields: function() {
        var check_box_margins = '5 0 5 0';
        return [{
            name: 'saveLog',
            xtype: 'rallycheckboxfield',
            boxLabelAlign: 'after',
            fieldLabel: '',
            margin: check_box_margins,
            boxLabel: 'Save Logging<br/><span style="color:#999999;"><i>Save last 100 lines of log for debugging.</i></span>'
        },{
          name: 'usePoints',
          xtype: 'rallycheckboxfield',
          boxLabelAlign: 'after',
          fieldLabel: '',
          margin: check_box_margins,
          boxLabel: 'Show Leaf Story Points (uncheck to show leaf story count)'

        }];
    },

    getOptions: function() {
        var options = [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];

        return options;
    },

    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }

        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{
            showLog: this.getSetting('saveLog'),
            logger: this.logger
        });
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }

});
