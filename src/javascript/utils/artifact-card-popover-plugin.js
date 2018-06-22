Ext.define('Rally.ui.cardboard.plugin.ArtifactCardPopover', {
    alias: 'plugin.artifactcardpopover',
    extend: 'Ext.AbstractPlugin',
    requires: ['Rally.ui.popover.PopoverFactory'],

    init: function(card) {
        this.card = card;
        this.card.popoverPlugin = this;
        this.card.on('rerender', this._onRerender, this);
        this.card.on('fieldclick', this._onFieldClick, this);
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
        if (!Ext.getElementById('description-popover')) {
            this._createPopover({
                context: this.card.context,
                field: 'Description',
                offsetFromTarget: [{x:0, y:-10}, {x:12, y:0}, {x:0, y:10}, {x:-15, y:0}],
                target: this.card.getEl().down('.formatted-id-template'),
                targetSelector: '.' + this.card.getCardRecordCls() + ' .formatted-id-template'
            });
        }
    },

    showUserStories: function() {
        var popoverConfig = {
            field: 'LeafStoryCount',
            offsetFromTarget: [{x:0, y:-8}, {x:15, y:0}, {x:5, y:15}, {x:-15, y:0}],
            target: this.card.getEl().down('.story-summary'),
            targetSelector: '.' + this.card.getCardRecordCls() + ' .story-summary',
            name: 'LeafStoryCount'
            // listViewConfig: {
            //     addNewConfig: {
            //         ignoredRequiredFields: ['Name', 'State', 'WorkProduct', 'Project', 'ScheduleState']
            //     }
            // }
        };

        // var fieldDefinition = _.find(this.card.getFieldDefinitions(), function (field) {
        //     return field.name === 'UserStories';
        // });
        //
        // if (fieldDefinition && fieldDefinition.popoverConfig) {
        //     popoverConfig = Ext.merge(popoverConfig, fieldDefinition.popoverConfig);
        // }

        this._createPopover(popoverConfig);
    },

    showPredecessorsAndSuccessors: function() {
        return this._createPopover({
            field: 'PredecessorsAndSuccessors',
            offsetFromTarget: [{x:0, y:-8}, {x:15, y:0}, {x:5, y:15}, {x:-15, y:0}],
            target: this.card.getEl().down('.field-content.PredecessorsAndSuccessors')
        });
    },

    _createPopover: function(popoverCfg) {
        this.card.select();
        if (this.popover) {
            this.popover.destroy();
        }
        this.popover = Rally.ui.popover.PopoverFactory.bake(Ext.apply({
            target: this.card.getEl(),
            targetSelector: '.' + this.card.getCardRecordCls(),
            record: this.card.getRecord(),
            offsetFromTarget: [{x:0, y:-8}, {x:15, y:0}, {x:5, y:8}, {x:-15, y:0}],
            autoShow: false
        }, popoverCfg));
        this.popover.on('destroy', this._onPopoverDestroy, this);
        this.popover.on('afterrender', this._onPopoverAfterRender, this);
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

    _showProgressPopover: function (progressFieldName) {
        var cardEl = this.card.getEl();
        var record = this.card.getRecord();

        this._createPopover({
            field: progressFieldName,
            target: cardEl.down('.field-' + progressFieldName + '.progress-bar-container'),
            targetSelector: '#' + cardEl.id + ' .field-' + progressFieldName + '.progress-bar-container',
            percentDoneData: record.data,
            percentDoneName: 'PercentDoneByStoryCount',
            piRef: record.data._ref
        });
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
