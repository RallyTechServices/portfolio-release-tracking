Ext.define('Rally.ui.popover.OrphanPopover', {
    alias: 'widget.orphanpopover',
    extend: 'Rally.ui.popover.TreeGridPopover',

     constructor: function(config) {
       var mapper = Ext.create('Rally.data.wsapi.ParentChildMapper');

       config = Ext.apply({

         gridConfig: {
             enableRanking: false,
             enableInlineAdd: false,
             expandAllInColumnHeaderEnabled: false,
             storeConfig: {
                 mapper: mapper,
                 context: {

                     project: null
                 },
                 enableHierarchy: true,
                 fetch: ['FormattedID','Name','ScheduleState','PlanEstimate','Owner'],
                 pageSize: 5
               }
           }
       }, config);

       this.callParent(arguments);
     }

  });
