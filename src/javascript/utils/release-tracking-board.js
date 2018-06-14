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

    dependencies: null,


    constructor: function(config){
      config.columns = this._getColumns(config);
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

                    if (showDependencies){
                        var query = Ext.String.format("(({0}.Release.Name = \"{1}\") AND (DirectChildrenCount = 0))",featureName, release.Name);
                        filters = Rally.data.wsapi.Filter.fromQueryString(query);
                    }
                    if (showStories){ //This means we want to see orphaned stories (not associated with a feature)
                      var query = Ext.String.format("(Release.Name = \"{0}\")", release.Name);
                      if (!filters){
                          filters = Rally.data.wsapi.Filter.fromQueryString(query);
                      } else {
                         filters = Rally.data.wsapi.Filter.or(filters);
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

                  if (showDependencies){
                      var query = Ext.String.format("(({0}.Release.Name = \"{1}\") AND (DirectChildrenCount = 0))",featureName, release.Name);
                      filters = Rally.data.wsapi.Filter.fromQueryString(query);
                  }
                  if (showStories){ //This means we want to see orphaned stories (not associated with a feature)
                    var query = Ext.String.format("(Release.Name = \"{0}\")", release.Name);
                    if (!filters){
                        filters = Rally.data.wsapi.Filter.fromQueryString(query);
                    } else {
                       filters = Rally.data.wsapi.Filter.or(filters);
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
          fields = fields.concat('PlanEstimate','Iteration','EndDate');
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

              if (model.isUserStory()){
                model.addField({
                   name: '__isHidden',
                   convert: function(v, record){
                     console.log('__isHidden: ',record.get('Name'),' showStories=', showStories, ' showDependencies=',showDependencies);
                     var  showThis = false;

                     if (showDependencies){
                       showThis = record.get(featureName).Project._ref != record.get('Project')._ref;
                     }

                     console.log('showThis', showThis, record.get(featureName));
                     if (showStories){
                       showThis = !record.get(featureName); //|| record.get(featureName).Release.Name != releaseName; //This is an orphan.
                     }
                     console.log('showThis exiting=', showThis);
                     return !showThis;
                   }
                });
              }// end isUserStory model
          } //end if.. portfolioitem .. else

        return model;
    }
  });
