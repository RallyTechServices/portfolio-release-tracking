Ext.define('Rally.ui.cardboard.plugin.ArtifactCardPopover', {
    alias: 'plugin.artifactcardpopover',
    extend: 'Ext.AbstractPlugin',
    requires: ['Rally.ui.popover.PopoverFactory'],

    init: function(card) {
        this.card = card;
        this.card.popoverPlugin = this;
        this.card.on('rerender', this._onRerender, this);
        this.card.on('fieldclick', this._onFieldClick, this);
        this.card.on('mouseout', this._hidePopover, this);
    },

    destroy: function() {
        if (this.card) {
            delete this.card.popoverPlugin;
            delete this.card;
        }

        if (this.popover) {
            this.popover.destroy();
            delete this.popover;
        }

        this.callParent(arguments);
    },

    showDescription: function() {
        if (/portfolioitem/.test(this.card.getRecord().getType())){
          if (!Ext.getElementById('description-popover')) {
            Ext.create('Rally.data.wsapi.Store',{
                model: this.card.getRecord().getType(),
                fetch: ['FormattedID','Name','PlannedEndDate'],
                filters: [{
                  property: 'ObjectID',
                  value: this.card.getRecord().getOid()
                }]
            }).load({
                callback: function(records, operation){
                    if (operation.wasSuccessful()){
                      this._createPopover({
                          context: this.card.context,
                          field: 'Description',
                          record: records[0],
                          offsetFromTarget: [{x:0, y:-10}, {x:12, y:0}, {x:0, y:10}, {x:-15, y:0}],
                          target: this.card.getEl().down('.formatted-id-template'),
                          targetSelector: '.' + this.card.getCardRecordCls() + ' .formatted-id-template'
                      });
                  }
                },
                scope: this
          });
        }
      }
    },
    showItem: function(){
        if (/portfolioitem/.test(this.card.getRecord().getType())){

            Ext.create('Rally.data.wsapi.Store',{
                model: this.card.getRecord().getType(),
                fetch: ['FormattedID','Name','PlannedEndDate'],
                filters: [{
                  property: 'ObjectID',
                  value: this.card.getRecord().getOid()
                }]
            }).load({
                callback: function(records, operation){
                    if (operation.wasSuccessful()){
                      this._createPopover({
                          field: 'UserStory',
                          record: records[0],
                          offsetFromTarget: [{x:0, y:-10}, {x:12, y:0}, {x:0, y:10}, {x:-15, y:0}],
                          target: this.card.getEl().down('.ItemSummary'),
                          targetSelector: '.' + this.card.getCardRecordCls() + ' .ItemSummary',
                          listViewConfig: {
                              gridConfig: {
                                  columnCfgs: ['FormattedID','Name','ScheduleState','PlanEstimate','Owner'],
                                  enableRanking: false
                              }
                          }
                      });
                  }
                },
                scope: this
          });

      } else {


        this.card.select();
        if (this.popover) {
            this.popover.hide();
            this.popover.destroy();
        }

        this.popover = Ext.create('Rally.ui.popover.OrphanPopover',{
          modelNames: this.card.getRecord().getItemModels(),
          title: this.card.getRecord().getGroupName(),
          gridConfig: {
              columnCfgs: ['FormattedID','Name','ScheduleState','PlanEstimate','Owner'],
              storeConfig: {
                  filters: this.card.getRecord().getItemFilters(),
                  context: { project: null }
              }
          },
          offsetFromTarget: [{x:0, y:-10}, {x:12, y:0}, {x:0, y:10}, {x:-15, y:0}],
          target: this.card.getEl().down('.ItemSummary'),
          targetSelector: '.' + this.card.getCardRecordCls() + ' .ItemSummary',
          offsetFromTarget: [{x:0, y:-8}, {x:15, y:0}, {x:5, y:8}, {x:-15, y:0}],
          autoShow: false
        });
        this.popover.on('destroy', this._onPopoverDestroy, this);
        //this.popover.on('afterrender', this._onPopoverAfterRender, this);
        this.popover.show();

      }
    },
    showdependency: function(){
      this.card.select();
      if (this.popover) {
          this.popover.destroy();
      }
      if (this.card.getRecord().hasDependencies() && this.card.get('FormattedID')){

      }
      // var coords = {};
      // var boardX = board.getX(),
      //     boardY = board.getY(),
      //     items = [];
      //
      // var xOffset = -board.getX() - board.getEl().getMargin().left;
      // var yOffset = -board.getY() - board.getEl().getMargin().top;
      // var depHash = _.reduce(board.getCards(), function(h,cc){
      //     _.each(cc, function(c){
      //       if (c.getRecord().hasDependencies() && c.getRecord().get('FormattedID')){
      //           h[c.getRecord().get('FormattedID')] = c;
      //       }
      //     });
      //    return h;
      // },{});
      //
      // _.each(board.getCards(), function(cs){
      //    _.each(cs, function(c){
      //     var dep = c.getRecord().get('__dependency'),
      //         depParent = depHash[dep];
      //     var hs = c.getHotSpot();
      //     items.push({
      //         type: 'rect',
      //         width: hs.width,
      //         height: hs.height,
      //         x: hs.x+ xOffset,
      //         y: hs.y + yOffset ,
      //         fill: 'transparent',
      //         border: 'transparent',
      //         style: {
      //           cursor: 'pointer'
      //         },
      //         listeners: {
      //            click: function(e,t){
      //               c.fireEvent('fieldclick','Item');
      //            },
      //            mouseover: function(e,t){
      //               c.fireEvent('fieldClick','Description');
      //            },
      //            scope: c
      //         }
      //     });
      //     if (dep && depParent){
      //          var p = c.getConnectorPoint(depParent.getX(), depParent.getY());
      //           var p2 = depParent.getConnectorPoint(c.getX(),c.getY());
      //          items.push({
      //            type: "circle",
      //            fill: 'red',
      //            radius: 5,
      //           x: p.x + xOffset,
      //           y: p.y + yOffset
      //
      //          });
      //          items.push({
      //            type: "circle",
      //            fill: 'red',
      //            radius: 5,
      //           x: p2.x + xOffset,
      //           y: p2.y + yOffset
      //
      //          });
      //          items.push({
      //            type: "path",
      //            path: Ext.String.format("M{0} {1} L {2} {3}",p.x+ xOffset,p.y+ yOffset,p2.x+ xOffset,p2.y+ yOffset),
      //            fill: "transparent",
      //            stroke: "red",
      //            "stroke-width": "1"
      //          });
      //     }
      //     })
      // });
      //
      //
      // var drawComponent = Ext.create('Ext.draw.Component', {
      //     style: Ext.String.format('position:absolute; top:{0}px; left:{1}px;z-index:auto', boardY,boardX),
      //     itemId: 'dependencies',
      //     id: 'dep',
      //     viewBox: false,
      //     margin: 10,
      //     height: board.getHeight(),
      //     width: board.getWidth(),
      //     items: items
      // });
      // this.add(drawComponent);
    },
    _createPopover: function(popoverCfg) {

        if (this.popover) {
            this._hidePopover();
            this.popover.destroy();
        }

        this.card.select();

        this.popover = Rally.ui.popover.PopoverFactory.bake(Ext.apply({
            autoShow: false,
            autoCenter: false
        }, popoverCfg));
        this.popover.on('destroy', this._onPopoverDestroy, this);
        this.popover.relayEvents(this.card, ['mouseout'])
        //this.popover.on('afterrender', this._onPopoverAfterRender, this);
        this.popover.show();

    },

    _onPopoverDestroy: function() {
        if (this.card) {
            this.card.deselect();
        }
        delete this.popover;
    },

    _onPopoverAfterRender: function() {
        if (Rally.BrowserTest) {
            Rally.BrowserTest.publishComponentReady(this);
        }
    },

    _onFieldClick: function(fieldName) {
        var fn = this['show' + fieldName];
        if(Ext.isFunction(fn)) {
            fn.call(this);
        }
    },

    _onRerender: function() {
        if (this.popover) {
            this.popover.alignToTarget();
            if (this.popover.down('.rallylistview')) {
                this.popover.down('.rallylistview').realignGridEditor();
            }
        }
    }
});
