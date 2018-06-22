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
      console.log('toggleDependencies',board);
      if (!board){
         this.down('#dependencies') && this.down('#dependencies').destroy();
         return;
      }

    //  var board = this.down('portfolioreleasetrackingboard');
      console.log('before',  board.getCards());
      var coords = {};
      _.each(board.getCards(), function(cs){
          _.each(cs, function(c){
             var dep = c.getRecord().get('__dependency');
             if (dep){
                 if (!coords[dep]){
                     coords[dep] = { x: null,
                                     y: null,
                                     deps: []
                                   };
                 }
                 coords[dep].deps.push({
                   x: c.getX(),
                   y: c.getY()
                 });
             } else if (!c.getRecord().get('__hidden')){
                 var fid = c.getRecord().get('FormattedID');
                 if (!coords[fid]){
                    coords[fid] = { x: null,
                                    y: null,
                                    deps: []
                                  };

                 }
                 coords[fid].x = c.getX();
                 coords[fid].y = c.getY();
             }
          });
          //coords.push({x: c.getX(), y: c.getY()});
      });
      console.log('after');

      var items = [];

      _.each(coords, function(c){
          if (c.x && c.y && c.deps.length > 0){
              _.each(c.deps, function(d){
                  items.push({
                    type: "path",
                    path: Ext.String.format("M{0} {1} L {2} {3}",c.x,c.y,d.x,d.y),
                    fill: "transparent",
                    stroke: "blue",
                    "stroke-width": "1"
                  });
              });
          }
      });

      var drawComponent = Ext.create('Ext.draw.Component', {
          style: Ext.String.format('position:absolute; top:{0}px; left:{1}px;z-index:auto',board.getX(), board.getY()),
          itemId: 'dependencies',
          viewBox: false,
          //cls: 'dependencycomponent',
          height: board.getHeight(),
          width: board.getWidth(),
          items: items
          // items: [{
          //   type: "path",
          //   path: "M310 50 C 320 20, 340 60, 350 10",
          //   fill: "transparent",
          //   stroke: "red",
          //   "stroke-width": "10"
          // }]
      });
      this.add(drawComponent);

        // drawComponent.surface.add({
        //   type: "path",
        //   path: "M310 10 C 320 20, 340 20, 350 10",
        //   fill: "transparent",
        //   stroke: "red",
        //   "stroke-width": "10",
        //
        // });
        //
        // drawComponent.surface.add({
        //     type: 'circle',
        //     fill: '#79BB3F',
        //     radius: 100,
        //     x: 100,
        //     y: 100
        // });

    },
    _initializeApp: function(iterations){
      this._addToggles();
        this._buildBoard(iterations);
    },
    _buildBoard: function(iterations){
      this.logger.log('_buildBoard',iterations);

      this.toggleDependencies(false);

      var board = this.down('#trackingbboard');
      if (board){
        board.destroy();
      }
      if (iterations){
         this.iterations = iterations;
      }

      var b = this.add({
         xtype: 'portfolioreleasetrackingboard',
         itemId: 'trackingbboard',
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
          // },{
          //   xtype: 'button',
          //   iconCls: 'icon-story icon-predecessor',
          //   itemId: 'showStoryDependencies',
          //   cls: 'primary rly-small',
          //   margin: 5,
          //   pressed: true,
          //   enableToggle: true,
          //   toggleHandler: this._toggleOptions,
          //   scope: this
          }]
        });
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
