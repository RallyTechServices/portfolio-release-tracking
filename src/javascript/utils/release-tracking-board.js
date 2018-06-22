Ext.define("CArABU.technicalservices.portfolioreleasetracking.Board", {
    extend: 'Rally.ui.cardboard.CardBoard',
    alias: 'widget.portfolioreleasetrackingboard',

    config: {

      release: null,
      usePoints: true,
      showStories: true,
      showDefects: true,
      showDependencies: true,
      iterations: null,
      toFrontOnShow: false,
      style: {

        "z-index":0
      },

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
      },
      storeConfig: {
          listeners: {
            load: function(store, records){
                  console.log('store',records,this);
                  var projectOrphans = {};

                  _.each(records, function(r){
                      var proj = r.get('Project').ObjectID;

                      if (r.get('Feature') && r.get('Feature').Project.ObjectID == proj){
                          r.set('__hidden',true);
                      }

                      if (r.get('__isOrphan')){

                         if (!projectOrphans[proj]){

                            projectOrphans[proj] = r;
                            r.set('__totalCount', 0);
                            r.set('__acceptedCount', 0);
                            r.set('__totalPoints', 0);
                            r.set('__acceptedPoints', 0);
                            r.set('__hidden',false);

                         } else {
                             r.set('__hidden',true);
                         }

                         var isAccepted = r.get('AcceptedDate');

                         projectOrphans[proj].set('__totalCount', projectOrphans[proj].get('__totalCount') + 1);
                         projectOrphans[proj].set('__totalPoints', projectOrphans[proj].get('__totalPoints') + r.get('PlanEstimate'));
                         if (isAccepted){
                           projectOrphans[proj].set('__acceptedCount', projectOrphans[proj].get('__acceptedCount') + 1);
                           projectOrphans[proj].set('__acceptedPoints', projectOrphans[proj].get('__acceptedPoints') + r.get('PlanEstimate'));
                         }
                      }
                  });
              }
          }
        }
    },

    dependencies: null,

    constructor: function(config){
      config.columns = this._getColumns(config);
      // config.renderTpl =  [
      //   '<svg width="200" height="250" version="1.1" xmlns="http://www.w3.org/2000/svg" style="z-index:auto;position:absolute;top:0px;left:0px;"><line x1="10" y1="10" x2="300" y2="300" fill="none" stroke="blue" stroke-width="5" style="z-index:auto;"></svg>'
      // ]
      this.mergeConfig(config);
      this.callParent(arguments);

    },

    _getColumns: function(config){

      var iterations = config.iterations,
          usePoints = config.usePoints,
          release = config.release,
          featureName = config.featureName,
          showStories = config.showStories,
          showDefects = config.showDefects,
          showDependencies = config.showDependencies;

        var additionalFetch = this._getAdditionalFieldsList(showStories, showDependencies,showDefects, usePoints, featureName);
        var columns = [];
        console.log('additionalfetch', additionalFetch);
        _.each(iterations, function(i) {

            columns.push({
                value: i.EndDate,
                additionalFetchFields: additionalFetch,
                columnHeaderConfig: {
                    headerData: i
                  },

                getStoreFilter: function(model){

                  console.log('model',model.getName());

                /*** Lowest level portfolio item ***/
                  if (model.isLowestLevelPortfolioItem()){
                    return [{
                       property: "PlannedEndDate",
                       operator: '>',
                       value: i.StartDate
                   },{
                       property: "PlannedEndDate",
                       operator: '<=',
                       value: i.EndDate
                   },{
                     property: "Release.Name",
                     value: release.Name
                   }];
                  }

                /*** HierarchicalRequirement ***/
                  if (model.isUserStory() && (showDependencies || showStories)){
                    var filters = null;

                    if (showDependencies || showStories){
                        var query = Ext.String.format("(({0}.Release.Name = \"{1}\") AND (DirectChildrenCount = 0))",featureName, release.Name);
                        filters = Rally.data.wsapi.Filter.fromQueryString(query);
                    }
                    if (showStories){ //This means we want to see orphaned stories (not associated with a feature)
                      var query = Ext.String.format("((Release.Name = \"{0}\") AND ({1} = \"\"))", release.Name, featureName);
                      if (!filters){
                          filters = Rally.data.wsapi.Filter.fromQueryString(query);
                      } else {
                         filters = filters.or(Rally.data.wsapi.Filter.fromQueryString(query));
                      }
                    }

                    return filters.and({
                       property: 'Iteration.Name',
                       value: i.Name
                    });
                  }

                  /*** DEFECT
                      Technically this code should never execute if show
                      defects isn't on.
                  ***/
                    if (model.isDefect()){
                         return [{
                           property: 'Release.Name',
                           value: release.Name
                         },{
                           property: 'Iteration.Name',
                           value: i.Name
                         }];
                    }


                }
            });
        });

        columns.push({
          value: null,
          columnHeaderConfig: {
              headerData: {Name: 'Unscheduled'}
          },
          additionalFetchFields: additionalFetch,

          getStoreFilter: function(model){

            /*** Lowest level portfolio item ***/
              if (model.isLowestLevelPortfolioItem()){
                return [{
                   property: "PlannedEndDate",
                   value: null
               },{
                 property: "Release.Name",
                 value: release.Name
               }];
              }

              /*** HierarchicalRequirement ***/
              if (model.isUserStory() && (showDependencies || showStories)){
                  var filters = null;

                  if (showDependencies || showStories){
                      var query = Ext.String.format("(({0}.Release.Name = \"{1}\") AND (DirectChildrenCount = 0))",featureName, release.Name);
                      filters = Rally.data.wsapi.Filter.fromQueryString(query);
                  }
                  if (showStories){ //This means we want to see orphaned stories (not associated with a feature)
                    var query = Ext.String.format("((Release.Name = \"{0}\") AND ({1} = \"\"))", release.Name, featureName);
                    if (!filters){
                        filters = Rally.data.wsapi.Filter.fromQueryString(query);
                    } else {
                       filters = filters.or(Rally.data.wsapi.Filter.fromQueryString(query));
                    }
                  }
                  return filters.and({
                     property: 'Iteration',
                     value: ""
                  });
                }

                /*** DEFECT
                    Technically this code should never execute if show
                    defects isn't on.
                ***/
                  if (model.isDefect() && showDefects){
                       return [{
                         property: 'Release.Name',
                         value: release.Name
                       },{
                         property: 'Iteration',
                         value: ""
                       }];
                  }
              } //end getStoreFilter
        });

        return columns;
    },

  // Override to create extended models
    _getAdditionalFieldsList: function(showStories, showDependencies,showDefects, usePoints,featureName){

      var fields = ['Name','FormattedID','PlannedEndDate','Project','Release']
      if (usePoints){
         fields = fields.concat(['LeafStoryPlanEstimateTotal','AcceptedLeafStoryPlanEstimateTotal']);
      } else {
         fields = fields.concat(['LeafStoryCount','AcceptedLeafStoryCount']);
      }

      if (showDependencies || showStories){
          fields.push(featureName);
      }
      if (showDependencies || showStories || showDefects){
          fields = fields.concat('PlanEstimate','Iteration','EndDate','AcceptedDate');
      }
      return fields;
    },
    _retrieveModels: function(success){
        var types = ['PortfolioItem/' + this.featureName];
        if (this.showStories || this.showDependencies){
           types.push('HierarchicalRequirement');
        }
        if (this.showDefects){
           types.push('Defect');
        }
        console.log('retrieve models')
        Rally.data.ModelFactory.getModels({
            types: types,
            context: this.context,
            success: function (models) {
              this.models = _.map(_.values(models), this._addModelFields, this);
              this.onModelsRetrieved(success);
            },
            scope: this,
            requester: this
        });
    },

    _addModelFields: function(model){
        var iterations = this.iterations,
          featureName = this.featureName,
          showDependencies = this.showDependencies,
          showStories = this.showStories,
          releaseName = this.release.Name;

          if (model.isPortfolioItem()){

            model.addField({
               name: '__isOrphan',
               defaultValue: false
            });

            model.addField({
                  name: '__dateBucket',
                  defaultValue:  null,
                  convert: function(v,record){
                    var dt = record.get('PlannedEndDate'),
                        db = null;

                    _.each(iterations, function(i){
                       if ((i.StartDate < dt ) && (i.EndDate >= dt)){
                          db = i.EndDate;
                          return false;
                       }
                    });
                    return db;
                  }
              });
          } else {

           model.addField({
              name: '__totalCount',
              defaultValue: 0
           });
           model.addField({
              name: '__acceptedCount',
              defaultValue: 0
           });
           model.addField({
              name: '__totalPoints',
              defaultValue: 0
           });
           model.addField({
              name: '__acceptedPoints',
              defaultValue: 0
           });
           model.addField({
               name: '__isHidden',
               defaultValue: false
           });
           model.addField({
             name: '__isOrphan',
             convert: function(v,record){
                     if (record.get('_type') == "defect" || !record.get(featureName)){
                         return true;
                     };
                     return false;
                 }
            });

            model.addField({
               name: '__dependency',
               convert: function(v,record){
                 if (record.get('_type') == "hierarchicalrequirement" && record.get(featureName) && record.get(featureName).Project.ObjectID != record.get('Project').ObjectID){
                     console.log('__dependency!!');
                     return record.get(featureName).FormattedID;
                 };
                 return false;
               }
            });

            model.addField({
                name: '__dateBucket',
                defaultValue:  null,
                convert: function(v,record){
                  var it = record.get('Iteration') && record.get('Iteration')._refObjectName;
                  var db = null;

                    _.each(iterations, function(i){
                       if ((i.Name == it )){
                          db = i.EndDate;
                          return false;
                       }
                    });

                 return db;
                }
            });

          } //end if.. portfolioitem .. else
        return model;
    }
  });
