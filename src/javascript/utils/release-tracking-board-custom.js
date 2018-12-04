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
        collapsible: false,
        field: "Project",
        fieldDef: {readOnly: true, name: 'Project'},
        headerConfig: {
          xtype: 'artifactboardrowheader'
        }
      },
      columnConfig: {
        xtype: 'artifactboardcolumn',
        autoLoadCardThreshold: 1000,
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
      this.mergeConfig(config);
      this.callParent(arguments);
    },

    getRowFor: function (item) {
      var rows = this.getRows(),
          record = item.isModel ? item : item.getRecord(),
          row;

      if (this._hasValidRowField()) {
          row = _.find(rows, function (row) {
              return row.isMatchingRecord(record);
          }) ||
          this._createRow({
              showHeader: true,
              value: record.get(this.rowConfig.field),
              collapsible: this.rowConfig.collapsible || false
          }, true);
      } else {
          row = rows[0] || this._createDefaultRow();
      }
      return row;
    },

    // override because we don't seem to be setting collapsible above
    _renderColumns: function () {
        if (this.columnDefinitions.length > 0) {
            this._calculateMinWidth();

            this.getEl().update(this._getColumnContainerHtml());

            this.rowDefinitions = [];
            if(this._hasValidRowField()) {
                _.each(this.rowConfig.values, function(rowValue) {
                    this._createRow({
                        showHeader: true,
                        value: rowValue,
                        collapsible: this.rowConfig.collapsible || false
                    });
                }, this);
            } else {
                this._createRow({showHeader: false, isDefault: true});
            }

            this._addColumnsToDom();

            this.fireEvent('aftercolumnrender', this);
        }
    },

    _getColumnRecords: function(records, iteration){
       var db = iteration ? Rally.util.DateTime.format(iteration.EndDate, 'Y-m-d') : null;

        var recs =  _.filter(records, function(r){
            return r.get('__dateBucket') == db;
        });
        return recs;
    },

    _parseRows: function() {

      var projectParents = _.reduce(this.results, function(pph, r){
          _.each(r, function(rec){
              var proj = rec.get('Project');
              pph[proj._refObjectName] = proj.Parent && proj.Parent._refObjectName || null;
          });
          return pph;
      }, {});

      var sortedProjects = Ext.Array.sort(_.keys(projectParents));

      var hierarchicalSortedProjects = _.reduce(sortedProjects, function(top,project, list){
        if (!_.contains(sortedProjects, projectParents[project])){
          top.push(project);
        }
        return top;
      },[]);

     sortedProjects.reverse();
     var next = _.difference(sortedProjects, hierarchicalSortedProjects);  //returns all projects not in the top level

     while (next.length > 0){
       hierarchicalSortedProjects = _.reduce(next, function(hsl,project){
           if (_.contains(hsl, projectParents[project])){
               var idx = _.indexOf(hsl,projectParents[project]);
               hsl.splice(idx+1,0,project);
           }
           return hsl;
       },hierarchicalSortedProjects);
       next = _.difference(sortedProjects, hierarchicalSortedProjects);  //returns all projects not in the top level
     }

     var relevantProjects =  _.reduce(this.artifacts, function(arr, a){
           if (!_.contains(arr, a.get('Project'))){
               arr.push(a.get('Project'));
           }
           return arr;
       },[]);

       var vals = _.sortBy(relevantProjects, function(p){
          return _.indexOf(hierarchicalSortedProjects,p);
       });

      this.rowConfig.values = vals;
      return Deft.Promise.when()
    },
    _retrieveModels: function(success){
        this.models = [Ext.create('CArABU.technicalservices.portfolioreleasetracking.ArtifactModel')];
        //TODO: fetch records here...
        this.artifacts = this._buildArtifactRecords(this.results);
        this.onModelsRetrieved(success);
    },
    _buildColumnsFromModel: function () {

              var iterations = this.iterations,
                  usePoints = this.usePoints,
                  release = this.release,
                  featureName = this.featureName,
                  showStories = this.showStories,
                  showDefects = this.showDefects,
                  showDependencies = this.showDependencies,
                  artifacts = this.artifacts;

                var columns = [];

                _.each(iterations, function(i) {

                    columns.push({
                        value: i.EndDate,
                         xtype: 'artifactboardcolumn',
                        //additionalFetchFields: additionalFetch,
                        columnHeaderConfig: {
                            headerData: i
                          },

                          store: Ext.create('Rally.data.custom.Store',{
                               data: this._getColumnRecords(artifacts, i)
                          })

                    });
                }, this);

                columns.push({
                  value: null,
                   xtype: 'artifactboardcolumn',
                  columnHeaderConfig: {
                      headerData: {Name: 'Unscheduled'}
                  },
                  store: Ext.create('Rally.data.custom.Store',{
                       data: this._getColumnRecords(artifacts, null)
                  })

                });

                this.fireEvent('columnsretrieved', this, columns);

                this.columnDefinitions = [];
                this._toggleMask(true);
                _.each(columns, this.addColumn, this);
                this.renderColumns();

        },
        _buildArtifactRecords: function(results){
            var featureName = this.featureName,
                showDefects = this.showDefects,
                showStories = this.showStories,
                showDependencies = this.showDependencies,
                iterations = this.iterations;

            var featureHash = {};

            var models = _.map(results[0], function(rec){
              var m = Ext.create('CArABU.technicalservices.portfolioreleasetracking.ArtifactModel',{
                    __dateBucket: this._getFeatureDateBucket(rec,iterations),
                    __doneStates: this.doneStates,
                    __riskField: this.atRiskField,
                    __atRiskValue: this.atRiskValue,
                    __willNotCompleteValue: this.willNotCompleteValue,
                    id: rec.getId()
                });
                featureHash[rec.get('FormattedID')] = m;
                m.addItem(rec.getData());
                return m;
            }, this);

            if (showStories || showDependencies){
                var dependencies = results[1];
                var depModels = this._groupDependencies(dependencies, featureName, featureHash);
                _.each(depModels, function(d){
                    if (featureHash[d.get('__childDependency')]){
                        featureHash[d.get('__childDependency')].addChildDependency(d.get('FormattedID'));
                    }
                });
                models = models.concat(depModels);
            }


            var orphans = [];
            if (showStories){
               orphans = results[2];
            }
            if (showDefects){
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
        _groupDependencies: function(records, featureName, featureHash){
              var hash = {},
                groupedModels = [];

             _.each(records, function(r){
                 var d = r.getData(),
                     project = d.Project.Name,
                     iteration = d.Iteration && d.Iteration.Name || "Unscheduled",
                     feature = d[featureName] || null;

                var dependency = feature && (feature.Project._refObjectName != project) && featureHash[feature.FormattedID] && feature.FormattedID || null;

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
                           __childDependency: dependency
                         });
                         groupedModels.push(hash[project][iteration][feature.FormattedID]);
                   }
                   hash[project][iteration][feature.FormattedID].addItem(d);
                 }
             });
             return groupedModels;
        }
  });
