/**
 */
Ext.define('CArABU.ts.CardStatusTemplate', {
    extend: 'Ext.XTemplate',

    constructor: function(fieldValue, fieldName, additionalClass) {
        var fieldValueCls = 'itemstate';

        if (additionalClass) {
            fieldValueCls += ' ' + additionalClass;
        }

        this.callParent([
            '<div class="card-estimate-field">',
                '<div class="field-content ' + fieldName + '">',
                    '<div class="' + fieldValueCls + '">',
                        fieldValue,
                    '</div>',
                '</div>',
            '</div>'
        ]);

    }
});
