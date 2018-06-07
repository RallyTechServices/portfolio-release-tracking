Ext.define("CArABU.technicalservices.app.PortfolioReleaseTrackingBoard", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new CArABU.technicalservices.Logger(),
    defaults: { margin: 10 },

    integrationHeaders : {
        name : "CArABU.technicalservices.app.TSPortfolioReleaseTrackingBoard"
    },

    launch: function() {

        if (!this._validate()){
           return;
        }

        var release = this.getContext().getTimeboxScope().getRecord();

        this._fetchIterations(release).then({
           success: this._buildBoard,
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

        if (!release){
           deferred.reject('No Release selected.');
        } else {
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
        }
        return deferred.promise;
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
    _buildBoard: function(iterations){
      this.logger.log('_buildBoard',iterations);

      var columns = this._getColumns(iterations);

      this.add({
         xtype: 'portfolioreleasetrackingboard',
         types: ['PortfolioItem/Feature'],
         context: this.getContext(),
         columns: columns,
         iterations: iterations,
         storeConfig: {
            fetch: ['FormattedID','PlannedEndDate','Name'],
            listeners: {
              load: function(store, records){
                 _.each(records, function(r){
                   r.calculate(iterations,'PlannedEndDate');
                 });

              },
              scope: this
            }
          }
      });
    },
    _getColumns: function(iterations){
      var columns = [];

        _.each(iterations, function(i) {
            var endDate = i.EndDate || i.get('EndDate'),
                startDate = i.StartDate || i.get('StartDate');

            columns.push({
                value: endDate,
                additionalFetchFields: ['PlannedEndDate'],
                columnHeaderConfig: {
                    headerData: i
                },
                getStoreFilter: function(model){
                  return [{
                     property: "PlannedEndDate",
                     operator: '<=',
                     value: endDate
                 },{
                   property: "PlannedEndDate",
                   operator: '>',
                   value: startDate
                 }];
                }
            });
        });

        columns.push({
          value: null,
          columnHeaderConfig: {
              headerData: {Name: 'Unscheduled'}
          },
          additionalFetchFields: ['PlannedEndDate'],

          getStoreFilter: function(model){
            return {
               property: "PlannedEndDate",
               operator: '=',
               value: null
           };
          }
        });

        return columns;
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
