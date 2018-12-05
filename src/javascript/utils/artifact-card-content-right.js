Ext.define('CArABU.technicalservices.plugin.TrackingCardContentRight', {
   alias: 'plugin.trackingcardcontentright',
   extend: 'Rally.ui.cardboard.plugin.CardContentRight',

    inheritableStatics: {
        BOTTOM_SIDE_CLS: 'right-bottom-side',
        TOP_SIDE_CLS: 'right-top-side'
    },

    init: function (card) {
        this.card = card;
        card.contentRightPlugin = this;

        this._fieldNameToDisplay = this._getEstimateFieldName();

        card.on('afterrender', this._onAfterRender, this);
        card.on('rerender', this._onAfterRender, this);
        card.on('validitychange', this._onValidityChange, this);
    },

    _initializePreliminaryEstimateStore: function () {
        this.cardboard.preliminaryEstimateStore = Ext.create('Rally.data.wsapi.Store', {
            model: Ext.identityFn('PreliminaryEstimate'),
            autoLoad: true
        });
    },

    _hasField: function (columnName) {
        return this.card.getRecord().hasField(columnName) && _.some(this.card.getFields(), function (field) {
            return field === columnName || field.name === columnName;
        });
    },

    getDisplayedFields: function () {
        var fields = [''];
        if (this._fieldNameToDisplay) {
            fields.push(this._fieldNameToDisplay);
        }
        return fields;
    },

    getHtml: function () {
        this._initCurrentStatus();

        this._initCurrentEstimate();
        var tplData = Ext.clone(this.card.getRecord().data);

        return this.getTpl().apply(tplData);
    },

    getTpl: function () {
        if (!this.tpl) {
            var me = this;
            this.tpl = Ext.create('Ext.XTemplate', [
                '<td class="{[this.getTplClass()]}">',
                '<div class="{[Rally.ui.cardboard.plugin.CardContentRight.TOP_SIDE_CLS]}">',
                '{[this.getTopTpl(values)]}',
                '</div>',
                '<div class="{[Rally.ui.cardboard.plugin.CardContentRight.BOTTOM_SIDE_CLS]}">{[this.getBottomTpl(values)]}</div>',
                '</td>',
                {
                    getTplClass: function () {
                        var cls = 'rui-card-right-side';

                      //  if (me._shouldShowEstimate()) {
                            cls += ' has-estimate';
                       // }

                        return cls;
                    },
                    getTopTpl: function (recordData) {
                        return '<div class="field-content ItemSummary">' + me._currentEstimate + '</div>';
                    },
                    getBottomTpl: function (recordData) {
                        var additionalClass = me._currentStatus;

                        return Ext.create('CArABU.ts.CardStatusTemplate',
                            "", 'State', additionalClass).apply(recordData);
                    }
                }
            ]);
        }
        return this.tpl;
    },

    _removeTooltip: function () {
        if (this.estimateTooltip) {
            this.estimateTooltip.destroy();
        }
    },

    _onAfterRender: function () {
        this.cardboard = this.card.ownerColumn && this.card.ownerColumn.ownerCardboard;

        this._removeTooltip();

        var cardEstimateField = this.card.getEl().down('.card-estimate-field');

        if (cardEstimateField && this._shouldShowEstimate()) {
            this.estimateTooltip = Ext.create('Rally.ui.tooltip.ToolTip', {
                target: cardEstimateField,
                hideDelay: 100,
                anchor: 'left',
                mouseOffset: [2, 2],
                html: this._getTooltipHtml(),
                listeners: {
                    beforeShow: function(){
                        return !this.target.down('.rally-invalid-field');
                    }
                }
            });

            cardEstimateField.on('click', function () {
                this.estimateTooltip.hide();
            }, this);
        }
    },

    _onValidityChange: function(card, field, isValid) {
        if(!isValid && this.estimateTooltip) {
            this.estimateTooltip.hide();
        }
    },

    _onOwnerClick: function () {
        this.card.fireEvent('fieldclick', 'Owner', this.card);
    },

    _initCurrentStatus: function() {
        var state = "",
            status = this.card.getRecord().getStatus();

        switch(status){
          case "done":
             state = "icon-ok done";
             break;
          case "atrisk":
           state = "icon-warning atrisk";
           break;
         case "willnotcomplete":
           state = "icon-minus willnotcomplete";
           break;
        }

        this._currentStatus = state;
    },

    _initCurrentEstimate: function () {
        var record = this.card.getRecord();
        if (this.card.usePoints){
            this._currentEstimate = Ext.String.format("{0} / {1}", record.get('__acceptedPoints'), record.get('__totalPoints'));
        } else {
            this._currentEstimate = Ext.String.format("{0} / {1}", record.get('__acceptedCount'), record.get('__totalCount'));
        }
    },

    _shouldShowEstimate: function () {
        if (this._fieldNameToDisplay) {
            return this.card.getRecord().get('updatable') || !this._currentEstimate.needsValue;
        }
        return false;
    },

    _getTooltipHtml: function () {
        if (this._fieldNameToDisplay) {
            if (this._currentEstimate.needsValue) {
                return '<strong>Set ' + this.card.getRecord().getField(this._fieldNameToDisplay).displayName + '</strong>';
            }

            if (this._fieldNameToDisplay === 'PlanEstimate') {
                return this._getPlanEstimateTooltip();
            }

            if(this._fieldNameToDisplay === 'Estimate') {
                return this._getTaskEstimateTooltip();
            }

            if (this._fieldNameToDisplay === 'PreliminaryEstimate' && this.cardboard) {
                if (!this.cardboard.preliminaryEstimateStore) {
                    this._initializePreliminaryEstimateStore();
                }

                if (this.cardboard.preliminaryEstimateStore.count()) {
                    return this._getPreliminaryEstimateTooltip();
                } else {
                    this.cardboard.preliminaryEstimateStore.on('load', function () {
                        this.estimateTooltip.update(this._getPreliminaryEstimateTooltip());
                    }, this, { single: true });
                }
            }
        }
    },

    _getPlanEstimateTooltip: function () {
        var units = Rally.environment.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName;
        return 'Plan Estimate (' + units + ')';
    },

    _getTaskEstimateTooltip: function () {
        var units = Rally.environment.getContext().getWorkspace().WorkspaceConfiguration.TaskUnitName;
        return 'Estimate (' + units + ')';
    },

    _getPreliminaryEstimateTooltip: function () {
        var points;
        var name = this._currentEstimate.value;
        var estimate = _.find(this.cardboard.preliminaryEstimateStore.data.items, function (item) {
            return item.data.Name === name;
        });

        if (estimate) {
            points = estimate.data.Value;
            return '<div><strong>Preliminary Estimate</strong></div>' + '<div>' + estimate.data.Description + ' = ' + points + ' Point' + (points !== 1 ? 's' : '') + '</div>';
        }

        return 'Preliminary Estimate: ' + name;
    },

    destroy: function () {
        this._removeTooltip();
        this.callParent(arguments);
    }
});
