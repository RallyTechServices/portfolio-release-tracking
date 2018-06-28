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
         field: "Project",
         fieldDef: {readOnly: true, name: 'Project'},
         headerConfig: {
            xtype: 'artifactboardrowheader'
         }
      },
      columnConfig: {
         xtype: 'artifactboardcolumn',
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

    //  this._getColumns(config);

      this.mergeConfig(config);
    //    this._setRowConfig(config);
      this.callParent(arguments);

    },
    getRowFor: function (item) {
    var rows = this.getRows(),
        record = item.isModel ? item : item.getRecord(),
        row;

        console.log('rows',rows);

    if (this._hasValidRowField()) {
        console.log('has valid row field');
        row = _.find(rows, function (row) {
            return row.isMatchingRecord(record);
        }) ||
        this._createRow({
            showHeader: true,
            value: record.get(this.rowConfig.field)
        }, true);
    } else {
        console.log('does not have valid row field');
        row = rows[0] || this._createDefaultRow();
    }

    return row;
},


    _getColumnRecords: function(records, iteration){
       var db = iteration ? Rally.util.DateTime.format(iteration.EndDate, 'Y-m-d') : null;

        var recs =  _.filter(records, function(r){
            return r.get('__dateBucket') == db;
        });
        return recs;
    },
  _parseRows: function() {
    var vals = [];
      _.each(this.artifacts, function(a){
          if (!_.contains(vals, a.get('Project'))){
              vals.push(a.get('Project'));
          }
      });

      //TODO: Sort projects

      this.rowConfig.values = vals;
    return Deft.Promise.when()
},
    _retrieveModels: function(success){

        this.models = [Ext.create('CArABU.technicalservices.portfolioreleasetracking.ArtifactModel')];
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

        }
  });
