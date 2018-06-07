Ext.define("CArABU.technicalservices.portfolioreleasetracking.Board", {
    extend: 'Rally.ui.cardboard.CardBoard',
    alias: 'widget.portfolioreleasetrackingboard',

    config: {
      readOnly: true,
      attribute: '__dateBucket',
      rowConfig: {
         field: "Project"
      },
      columnConfig: {
           columnHeaderConfig: {
               headerTpl: '<span class="iname">{Name}</span><tpl if="StartDate"><br/><span class="idates">{[Rally.util.DateTime.format(values.StartDate,"Y-m-d")]} - {[Rally.util.DateTime.format(values.EndDate,"Y-m-d")]}</span></tpl>'
           }
       },
       storeConfig: {
          fetch: ['FormattedID','PlannedEndDate','Name'],
          listeners: {
            load: function(store, records){
               var iterations = this.iterations;
               console.log('load',iterations);
               _.each(records, function(r){
                 r.calculate(iterations,'PlannedEndDate');
               });

            },
            scope: this
          }
        }
    },

    constructor: function(config){
       this.mergeConfig(config);
       this.callParent(arguments);
    },

  // Override to create extended models
    _retrieveModels: function(success){

      CArABU.technicalservices.ArtifactCardModelBuilder.build('PortfolioItem/Feature','Feature_extended').then({
          success: function (model) {
              this.models = [model];
              this.onModelsRetrieved(success);
          },
          scope: this,
      });
    }
  });
