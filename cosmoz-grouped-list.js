/*global cz, document, Polymer, window, d3, nv */
(function () {

	"use strict";

	Polymer({

		is: 'cosmoz-grouped-list',

		properties: {

			data: {
				type: Array
			},

			as: {
				type: String,
				value: 'item'
			},

			flatData: {
				type: Array,
				computed: '_flattenData(data)',
				notify: true
			}
		},

		observers: [
			'_dataChanged(data.*)'
		],

		_foldedGroups: null,

		_groups: null,

		_templateSelectorsKeys: null,

		_templateSelectorsCount: null,

		_physicalItems: null,

		_templateInstances: null,

		attached: function () {
			this._groupTemplate = Polymer.dom(this).querySelector('#groupTemplate');
			this._itemTemplate = Polymer.dom(this).querySelector('#itemTemplate');
		},

		_dataChanged: function (change) {
			if (change.path === 'data') {
				// TODO: new data reference
			} else if (change.path === 'data.splices') {
				// TODO: data were removed/added
			} else {
				this._forwardItemPath(change.path.split('.').slice(1), change.value);
			}
		},

		_forwardItemPath: function (pathParts, value) {
			var groupIndex, itemIndex, item, itemPath, physicalIndex, templateInstance;
			if (pathParts.length >= 4 && pathParts[1] === 'items') {
				groupIndex = pathParts[0];
				if (groupIndex[0] === '#') {
					groupIndex = groupIndex.slice(1);
				}

				itemIndex = pathParts[2];
				if (itemIndex[0] === '#') {
					itemIndex = itemIndex.slice(1);
				}
				item = this.data[groupIndex].items[itemIndex];
				itemPath = pathParts.slice(3).join('.');
				physicalIndex = this._physicalItems.indexOf(item);

				// Notify only displayed items
				if (physicalIndex >= 0) {
					templateInstance = this._templateInstances[physicalIndex];
					templateInstance.notifyPath('item.' + itemPath, value);
				}
			} else if (pathParts.length >= 2) {
				groupIndex = pathParts[0];
				if (groupIndex[0] === '#') {
					groupIndex = groupIndex.slice(1);
				}
				item = this.data[groupIndex];
				itemPath = pathParts.slice(1).join('.');
				physicalIndex = this._physicalItems.indexOf(item);
				if (physicalIndex >= 0) {
					templateInstance = this._templateInstances[physicalIndex];
					templateInstance.notifyPath('item.' + itemPath, value);
				}
			}
		},

		_flattenData: function (data) {
			if (!data) {
				return;
			}

			if (!(data instanceof Array) || !(data[0] instanceof Object)) {
				return;
			}

			var
				fData = [],
				groups = new WeakMap();

			data.forEach(function (group) {
				if (group.items) {
					fData = fData.concat(group, group.items);
					groups.set(group, true);
				} else {
					fData = fData.concat(group);
				}
			});

			this._foldedGroups = new WeakMap();
			this._groups = groups;
			this._templateSelectorsKeys = new WeakMap();
			this._templateSelectorsCount = 0;
			this._physicalItems = [];
			this._templateInstances = [];

			return fData;
		},


		getGroup: function (item) {
			var foundGroup;
			this.data.some(function (group) {
				var found = group.items.indexOf(item) > -1;
				if (found) {
					foundGroup = group;
				}
				return found;
			});

			return foundGroup;
		},

		isFolded: function (group) {
			return !!this._foldedGroups.get(group);
		},

		isGroup: function (item) {
			return !!this._groups.get(item);
		},

		_getFolded: function (item) {
			var folded = this.isGroup(item) && this.isFolded(item);
			return folded;
		},

		_onTemplateSelectorItemChanged: function (event) {
			var
				item = event.detail.item,
				selector = event.detail.selector,
				selectorIndex,
				templateInstance;

			selectorIndex = this._templateSelectorsKeys.get(selector);

			if (!selectorIndex) {
				selectorIndex = this._templateSelectorsCount;
				this._templateSelectorsKeys.set(selector, selectorIndex);
				this._templateSelectorsCount += 1;
			}

			this._physicalItems[selectorIndex] = item;

			if (this.isGroup(item)) {
				templateInstance = selector.renderGroup(Polymer.dom(this).querySelector('#groupTemplate'), this.isFolded(item));
			} else {
				templateInstance = selector.renderItem(Polymer.dom(this).querySelector('#itemTemplate'));
			}

			this._templateInstances[selectorIndex] = templateInstance;
		},

		toggleFold: function (templateInstance) {
			var
				item = templateInstance.item,
				group = this.isGroup(item) ? item : this.getGroup(item),
				isFolded = this.isFolded(group);

			if (isFolded) {
				this.unfoldGroup(group);
			} else {
				this.foldGroup(group);
			}

			templateInstance.folded = !isFolded;

		},

		unfoldGroup: function (group) {
			if (!this.isFolded(group)) {
				return;
			}

			this._foldedGroups.set(group, false);
			var groupIndex = this.flatData.indexOf(group);
			this.splice.apply(this, ['flatData', groupIndex + 1, 0].concat(group.items));

		},

		foldGroup: function (group) {
			if (this.isFolded(group)) {
				return;
			}
			this._foldedGroups.set(group, true);
			var groupIndex = this.flatData.indexOf(group);
			this.splice('flatData', groupIndex + 1, group.items.length);
		},

		updateSizes: function (group) {
			var
				list = this.$.list,
				that = this;
			group.items.forEach(function (item) {
				that.notify(item);
				list.updateSizeForItem(item);
			});
		}
	});
}());