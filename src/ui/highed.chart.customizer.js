/******************************************************************************

Copyright (c) 2016, Highsoft

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

******************************************************************************/

/** UI For customizing a chart
 *  @constructor
 *  @emits PropertyChange - when a property changes
 *    > {string} - the path of the change
 *    > {anything} - the new value
 *    > {number} - the change array index
 *  @param parent {domnode} - the node to attach the editor to
 *  @param attributes {object} - the attributes
 *    > noAdvanced {bool} - set to false to force disable the advance view
 *    > availableSettings {string|array} - whitelist of exposed settings
 */
highed.ChartCustomizer = function (parent, attributes) {
    var properties = highed.merge({
            noAdvanced: false,
            availableSettings: []
        }, attributes),
        events = highed.events(),
        tabs = highed.TabControl(parent, true),
        simpleTab = tabs.createTab({title: 'SIMPLE'}),
        advancedTab = tabs.createTab({title: 'ADVANCED'}),
        
        splitter = highed.HSplitter(simpleTab.body, {leftWidth: 30}),
        list = highed.List(splitter.left),
        body = splitter.right,

        advSplitter = highed.HSplitter(advancedTab.body, {leftWidth: 30}),
        advBody = advSplitter.right,
        advTree = highed.Tree(advSplitter.left),

        flatOptions = {},
        chartOptions = {},

        highlighted = false,

        indicator = highed.dom.cr('div', 'highed-customizer-field-highlighter')
    ;

    properties.availableSettings = highed.arrToObj(properties.availableSettings);

    ///////////////////////////////////////////////////////////////////////////

    // highed.ready(function () {
    //     highed.dom.ap(document.body, indicator);
    // });

     /** Force a resize of the editor 
     *  @memberof highed.ChartCustomizer
     */
    function resize(w, h) {
        var bsize;
        
        tabs.resize(w, h);
        bsize = tabs.barSize();

        list.resize(w, h - bsize.h);
        splitter.resize(w, h - bsize.h - 10);
    }

    /** Init the customizer
     *  @memberof highed.ChartCustomizer
     *  @param foptions {object} - the customized options
     *  @param coptions {object} - the full chart options
     */
    function init(foptions, coptions) {
        flatOptions = foptions || {};
        chartOptions = coptions || flatOptions;
        list.reselect();
        buildTree();
        advTree.reselect();
    }

    function buildBody(entry) {

    }

    function applyFilter(detailIndex, filteredBy, filter) {       
        var selected = list.selected(),
            id = selected.id,
            entry = highed.meta.optionsExtended.options[id]
        ;

        if (!selected) return false;
        
        body.innerHTML = '';

        entry.forEach(function (thing) {
            selectGroup(thing, false, false, detailIndex, filteredBy, filter);
        });
        
        highlighted = false;
    }

    function shouldInclude(group) {
        var doInclude = false;

        if (Object.keys(properties.availableSettings).length > 0) {
            if (highed.isArr(group)) {
                group.forEach(function (sub) {
                    if (shouldInclude(sub)) {
                        doInclude = true;
                    }
                });
            } else if (highed.isArr(group.options)) {
                group.options.forEach(function (sub) {
                    if (shouldInclude(sub)) {
                        doInclude = true;
                    }
                });
            } else if (properties.availableSettings[group.id]) {
                doInclude = true;
            } 

            return doInclude;
        }
        
        return true;
    }

    //This function has mutated into a proper mess. Needs refactoring.
    function selectGroup(group, table, options, detailIndex, filteredBy, filter) {
        var master, vals, doInclude = true;

        options = options || flatOptions;

        if (highed.isArr(group.options)) {
            table = highed.dom.cr('table', 'highed-customizer-table');

            doInclude = shouldInclude(group);

            if (!doInclude) {
                return;
            }

            highed.dom.ap(body, 
                highed.dom.cr('div', 'highed-customizer-table-heading', group.text)
            );

            if (group.filteredBy) {
                filter = highed.getAttr(options, group.filteredBy, detailIndex);
            }

            if (group.controlledBy) {
                master = highed.dom.cr('select', 'highed-box-size highed-stretch');
            
                if (highed.isStr(group.controlledBy.options)) {
                    vals = highed.getAttr(options, group.controlledBy.options, detailIndex);

                    if (highed.isArr(vals)) {
                        if (vals.length === 0) {
                            highed.dom.ap(body, highed.dom.cr('i', '', 'No data to display..'));
                            return;
                        }

                        highed.dom.options(master,
                            vals.map(function (t) {
                                return group.controlledBy.optionsTitle ? t[group.controlledBy.optionsTitle] : t;
                            }),
                            detailIndex
                        );  

                        highed.dom.on(master, 'change', function () {
                            detailIndex = master.selectedIndex;

                            table.innerHTML = '';

                            group.options.forEach(function (sub) {
                                if (group.filteredBy) {
                                    filter = highed.getAttr(options, group.filteredBy, detailIndex);                                    
                                }
                                selectGroup(sub, table, options, detailIndex, group.filteredBy, filter);
                            });
                        });

                        highed.dom.ap(body, master);               
                        detailIndex = detailIndex || 0;
                    } else {
                        return;
                    }
                }
            }

            highed.dom.ap(body, table);

            group.options.forEach(function (sub) {
                selectGroup(sub, table, options, detailIndex, group.filteredBy, filter);
            });
                   
        } else if (typeof group.id !== 'undefined') {     

            //Check if we should filter out this column
            if (filter && group.subType && group.subType.length) {
                if (!highed.arrToObj(group.subType)[filter]) {
                    return;
                }
            }

            if (Object.keys(properties.availableSettings).length > 0) {
                if (!properties.availableSettings[group.id]) {
                    return;
                }
            }

            //highed.dom.ap(sub, highed.dom.cr('span', '', referenced[0].returnType));
            highed.dom.ap(table, 
                highed.InspectorField(
                    group.values ? 'options' : group.dataType, 
                    (highed.getAttr(options, group.id, detailIndex) || (filter && group.subTypeDefaults[filter] ? group.subTypeDefaults[filter] : group.defaults)), 
                    {
                        title: group.text,
                        tooltip: group.tooltipText,
                        values: group.values,
                        custom: group.custom,
                        attributes: group.attributes || []   
                    },
                    function (newValue) {        
                        events.emit('PropertyChange', group.id, newValue, detailIndex);
                        
                        if (group.id === filteredBy) {
                            //This is a master for the rest of the childs,
                            //which means that we need to rebuild everything 
                            //here somehow and check their subType
                            applyFilter(detailIndex, filteredBy, newValue);
                        }
                    },
                    false,
                    group.id
                )
            );
        }
    }

    function buildTree() {
        if (properties.noAdvanced || highed.isNull(highed.meta.optionsAdvanced)) {
            advancedTab.hide();
        } else {
            advTree.build(highed.meta.optionsAdvanced, chartOptions);        
        }
    }

    function build() {
        Object.keys(highed.meta.optionsExtended.options).forEach(function (key) {
            if (!shouldInclude(highed.meta.optionsExtended.options[key])) {
                return;
            }

            list.addItem({
                id: key,
                title: key
            });
        });

        buildTree();
    }

    /** Focus a category
     *  @memberof highed.ChartCustomizer
     *  @param thing {anything} - the category to focus
     */
    function focus(thing, x, y) {
        var n;

        list.select(thing.tab);
        n = body.querySelector('#' + thing.id);

        if (!n) return;

        var p = highed.dom.pos(n);

        highed.dom.style(n, {
            border: '2px solid #33aa33'
        });

        n.focus();
        n.scrollIntoView(true);

        setTimeout(function () {
            highed.dom.style(n, {
                border: ''
            });
        }, 2000);
        
        // var entry = highed.meta.optionsExtended.options[thing];

        // if (entry) {
        //     body.innerHTML = '';
        //     entry.forEach(function (thing) {
        //         selectGroup(thing);
        //     });
        // }
    }

    ///////////////////////////////////////////////////////////////////////////
    
    list.on('Select', function (id){
        var entry = highed.meta.optionsExtended.options[id];
        body.innerHTML = '';
        entry.forEach(function (thing) {
            selectGroup(thing);
        });
        highlighted = false;
    });

    advTree.on('Select', function (item, selected, arrIndex) {
        var table = highed.dom.cr('table', 'highed-customizer-table');
        advBody.innerHTML = '';

        Object.keys(item.entries).forEach(function (key) {
            var entry = item.entries[key];
            
            highed.dom.ap(table,
                highed.InspectorField(
                    entry.values ?  'options' : (entry.dataType || 'string'), 
                    (highed.getAttr(chartOptions, entry.id, arrIndex)  || entry.defaults), 
                    {
                        title: highed.uncamelize(entry.shortName),
                        tooltip: entry.description,
                        values: entry.values,
                        custom: {},
                        attributes: entry.attributes || []
                    },
                    function (newValue) {       
                        console.log(arrIndex);    
                        events.emit('PropertyChange', entry.id, newValue, arrIndex);
                    }
                )
            );
        });

        highed.dom.ap(advBody, 
            highed.dom.cr('div', 'highed-customizer-table-heading', selected),
            table
        );
    });

    advTree.on('DataUpdate', function (path, data) {
        events.emit('PropertyChange', path, data);
    });

    tabs.on('Focus', function () {
        init(flatOptions, chartOptions);
    });

    build();

    return {
        /* Listen to an event */
        on: events.on,
        resize: resize,
        init: init,
        focus: focus,
        reselect: list.reselect
    };
};