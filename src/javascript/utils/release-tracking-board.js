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
       cardConfig: {
          xtype: 'trackingcard'
      }
    },

    constructor: function(config){
       config.columns = this._getColumns(config.iterations, config.cardConfig.usePoints);
       this.mergeConfig(config);
       this.callParent(arguments);
    },

    _getColumns: function(iterations, usePoints){
      var columns = [];

      var featureFetch = ['PlannedEndDate','LeafStoryPlanEstimateTotal','AcceptedLeafStoryPlanEstimateTotal'];
      if (!usePoints){
        featureFetch = ['PlannedEndDate','LeafStoryCountTotal','AcceptedLeafStoryCountTotal'];
      }

        _.each(iterations, function(i) {

            columns.push({
                value: i.EndDate,
                additionalFetchFields: featureFetch,
                columnHeaderConfig: {
                    headerData: i
                },
                getStoreFilter: function(model){
                  return [{
                     property: "PlannedEndDate",
                     operator: '<=',
                     value: i.EndDate
                 },{
                   property: "PlannedEndDate",
                   operator: '>',
                   value: i.StartDate
                 }];
                }
            });
        });

        columns.push({
          value: null,
          columnHeaderConfig: {
              headerData: {Name: 'Unscheduled'}
          },
          additionalFetchFields: featureFetch,

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
