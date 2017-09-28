/**
 * Created by jiuzhou.zhang on 2017/9/19.
 */

'use strict'

import { OrderedMap, Map } from 'immutable'

class ListDataSource {
  _display = false
  _root = OrderedMap()
  _list = null

  display () {
    this._display = true
  }

  get data () {
    if (!this._display) {
      return null
    }

    if (!this._list) {
      this._list = []
      this._getList(this._root, this._list)
    }
    return this._list
  }

  _getList (map, list) {
    for (let key of map.keys()) {
      const item = map.get(key)
      if (item.get('hidden')) {
        continue
      }

      if (item.get('type') === 'group') {
        this._getList(item.get('children'), list)
      } else {
        list.push(item)
      }
    }
  }

  setHidden (keypath, hidden) {
    const item = this._getItem(keypath)
    if (item) {
      this._setRoot(this._setItem(keypath, null, item.set('hidden', hidden)))
    }
  }

  addGroup (keypath, { hidden = false } = {}) {
    const item = this._getItem(keypath)
    if (!item) {
      this._setRoot(this._setItem(keypath, 'group', { hidden }))
    }
  }

  resetGroup (keypath) {
    const item = this._getItem(keypath)
    if (item && item.get('type') === 'group') {
      this._setRoot(this._setItem(keypath, null, item.set('children', OrderedMap())))
    }
  }

  addOrUpdateComponent (keypath, { component = null, hidden = false, ...props }) {
    const item = this._getItem(keypath)

    if (item) { // update
      if (item.get('type') === 'component') {
        let newItem = item
        newItem = newItem.set('props', newItem.get('props').merge(Map(props)))
        this._setRoot(this._setItem(keypath, null, newItem))
      }
    } else {
      if (keypath.length > 1) {
        const groupItem = this._getItem(keypath.slice(0, -1))
        if (groupItem && groupItem.get('type') === 'group') {
          this._setRoot(this._setItem(keypath, 'component', { hidden, component, props: Map(props) }))
        }
      } else {
        this._setRoot(this._setItem(keypath, 'component', { hidden, component, props: Map(props) }))
      }
    }
  }

  _setRoot (newRoot) {
    if (newRoot !== this._root) {
      this._root = newRoot
      this._list = null
    }
  }

  _getItem (keypath, map = this._root) {
    const key = keypath[0]

    if (keypath.length > 1) {
      const subMap = map.get(key)
      if (subMap) {
        if (subMap.get('type') === 'group') {
          return this._getItem(keypath.slice(1), subMap.get('children'))
        }
      }
    } else {
      return map.get(key)
    }
  }

  _setItem (keypath, type, attrs = {}, map = this._root) {
    const key = keypath[0]

    if (keypath.length > 1) {
      const subMap = map.get(key)
      if (subMap) {
        if (subMap.get('type') === 'group') {
          return map.update(key, v => {
            v = v.set('children', this._setItem(keypath.slice(1), type, attrs, subMap.get('children')))
            return v
          })
        }
      }
    } else {
      let item = !Map.isMap(attrs) ? new Map({ type, ...attrs }) : attrs
      if (type === 'group') {
        item = item.set('children', OrderedMap())
      }
      return map.set(key, item)
    }

    return map
  }
}

export default function (factory = null) {
  const listDataSource = new ListDataSource()
  if (factory) {
    factory(listDataSource)
  }
  return listDataSource
}
