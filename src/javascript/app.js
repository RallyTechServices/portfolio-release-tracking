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
    featureModel: "PortfolioItem/Feature",

    launch: function() {

        if (!this._validate()){
           return;
        }

        var release = this.getContext().getTimeboxScope().getRecord();

         this._fetchIterations(release).then({
            success: this._initializeApp,
            failure: this._showErrorNotification,
            scope: this
         });

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
    toggleDependencies: function(board){
      if (!board){
         this.down('#dependencies') && this.down('#dependencies').destroy();
         return;
      }

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
          style: Ext.String.format('position:absolute; top:{0}px; left:{1}px;z-index:auto', boardY,boardX),
          itemId: 'dependencies',
          viewBox: false,
          margin: 10,
          //cls: 'dependencycomponent',
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

      var promises = [this._fetchWsapiRecords(this._getFeatureConfig(releaseName, featureName)),
        this._fetchWsapiRecords(this._getDependentStoryConfig(releaseName, featureName)),
        this._fetchWsapiRecords(this._getOrphanStoryConfig(releaseName, featureName)),
        this._fetchWsapiRecords(this._getOrphanDefectConfig(releaseName))];

      Deft.Promise.all(promises).then({
         success: function(results){
            //var records = this._buildArtifactRecords(results, iterations, featureName);
            deferred.resolve(results);
         },
         failure: function(msg){
            deferred.reject(msg);
         },
         scope: this
      });
      return deferred.promise;
    },
    _buildBoard: function(iterations, results){
      this.logger.log('_buildBoard',iterations);
      if (results){
         this.results = results;
      }
      if (iterations){
          this.iterations = iterations;
      }
      var artifacts = this._buildArtifactRecords(this.results, this.iterations);

      this.toggleDependencies(false);

      var board = this.down('#trackingbboard');
      if (board){
        board.destroy();
      }

      var b = this.add({
         xtype: 'portfolioreleasetrackingboard',
         itemId: 'trackingbboard',
         artifacts: artifacts,
         usePoints: this.getUsePoints(),
         showStories: this.getShowStories(),
         showDefects: this.getShowDefects(),
         showDependencies: this.getShowDependencies(),
         release: this.getContext().getTimeboxScope().getRecord().getData(),
         iterations: this.iterations,
         featureName: this.getPortfolioItemName(),
         context: this.getContext(),
         cardConfig: {
            usePoints: this.getUsePoints()
         }
      });

      if (this.getShowDependencies()){
         b.on('load', this.toggleDependencies, this);
      }
    },
    _addToggles: function(){
        this.add({
          xtype: 'container',
          layout: 'hbox',
          margin: 5,
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
    _buildArtifactRecords: function(results, iterations){

        var featureName = this.getPortfolioItemName(),
            showDefects = this.getShowDefects(),
            showStories = this.getShowStories(),
            showDependencies = this.getShowDependencies();

        var featureHash = {};
        var models = _.map(results[0], function(rec){
          var m = Ext.create('CArABU.technicalservices.portfolioreleasetracking.ArtifactModel',{
                __dateBucket: this._getFeatureDateBucket(rec,iterations),
                id: rec.getId()
            });
            featureHash[rec.get('FormattedID')] = m;
            m.addItem(rec.getData());
            return m;
        }, this);

        if (this.getShowDependencies() || this.getShowStories()){
            var dependencies = results[1];
            var depModels = this._groupDependencies(dependencies, featureName);
            _.each(depModels, function(d){
                featureHash[d.get('__dependency')].addChildDependency(d.get('FormattedID'));
            });
            models = models.concat(depModels);
        }


        var orphans = [];
        if (this.getShowStories()){
           orphans = results[2];
        }
        if (this.getShowDefects()){
           orphans = orphans.concat(results[3]);
        }
        models = models.concat(this._groupOrphans(orphans));
        return models;
    },
    _getFeatureDateBucket: function(rec, iterations){
      var dt = rec.get('PlannedEndDate'),
             db = null;

         _.each(iterations, function(i){
            if ((i.StartDate < dt ) && (i.EndDate >= dt)){
               db = Rally.util.DateTime.format(i.EndDate, 'Y-m-d');
               return false;
            }
         });
         return db;
    },
    _groupOrphans: function(records){
      var hash = {},
        groupedModels = [];

     _.each(records, function(r){
         var d = r.getData(),
             project = d.Project.Name,
             iteration = d.Iteration && d.Iteration.Name || "Unscheduled";

           if (!hash[project]){
               hash[project] = {};
           }
           if (!hash[project][iteration]){
             var db = d.Iteration ? Rally.util.DateTime.format(Rally.util.DateTime.fromIsoString(d.Iteration.EndDate), 'Y-m-d') : null;
            hash[project][iteration] = Ext.create('CArABU.technicalservices.portfolioreleasetracking.ArtifactModel',{
                  __groupedItem: true,
                  Project: project,
                  __dateBucket: db,
                  id: r.getId()
                });
                groupedModels.push(hash[project][iteration]);
          }
          hash[project][iteration].addItem(d);
     });
     return groupedModels;
    },
    _groupDependencies: function(records, featureName){
          var hash = {},
            groupedModels = [];

         _.each(records, function(r){
             var d = r.getData(),
                 project = d.Project.Name,
                 iteration = d.Iteration && d.Iteration.Name || "Unscheduled",
                 feature = d[featureName] || null;

                 var dependency = feature && (feature.Project._refObjectName != project) && feature.FormattedID || null;

             if (dependency){
               if (!hash[project]){
                   hash[project] = {};
               }
               if (!hash[project][iteration]){
                 hash[project][iteration] = {}
               }
               if (!hash[project][iteration][dependency]){
                 var db = d.Iteration ? Rally.util.DateTime.format(Rally.util.DateTime.fromIsoString(d.Iteration.EndDate), 'Y-m-d') : null;
                 hash[project][iteration][dependency] = Ext.create('CArABU.technicalservices.portfolioreleasetracking.ArtifactModel',{
                       __groupedItem: true,
                       Project: project,
                       __dateBucket: db,
                       id: r.getId(),
                       __dependency: dependency
                     });
                     groupedModels.push(hash[project][iteration][feature.FormattedID]);
               }
               hash[project][iteration][feature.FormattedID].addItem(d);
             }
         });
         return groupedModels;
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

      var fetch = ['Name','FormattedID','Project','Release','PlanEstimate','Iteration','EndDate','AcceptedDate'];

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
          limit: 'Infinity'
       };
    },
    _getOrphanDefectConfig: function(releaseName){

      var fields = ['Name','FormattedID','Project','Release','PlanEstimate','AcceptedDate','Iteration','EndDate'];

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
    _getDependentStoryConfig: function(releaseName, featureName){

        var fields = ['Name','FormattedID','Project','Release','PlanEstimate','AcceptedDate','Iteration','EndDate',featureName];

        return {
           model: "HierarchicalRequirement",
           fetch: fields,
           filters: [{
             property: featureName + ".Release.Name",
             value: releaseName
           },{
             property: 'DirectChildrenCount',
             value: 0
           }],
           context: {
              project: null
           },
           limit: 'Infinity'
        };
    },
    _getFeatureConfig: function(releaseName, featureName){

        var fields = ['DisplayColor','Name','FormattedID','PlannedEndDate','Project','Release','LeafStoryPlanEstimateTotal','AcceptedLeafStoryPlanEstimateTotal','LeafStoryCount','AcceptedLeafStoryCount'];

        return {
           model: "PortfolioItem/" + featureName,
           fetch: fields,
           filters: [{
              property: "Release.Name",
              value: releaseName
            }],
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

        this._buildBoard();
        if (btn.itemId == "showDependencies"){
           this.toggleDependencies(pressed);
        }

    },
    getShowStories: function(){
      return this.down('#showStories').pressed;
    },
    getShowDefects: function(){
      return this.down('#showDefects').pressed;
    },
    getShowDependencies: function(){
      return this.down('#showDependencies').pressed;
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
