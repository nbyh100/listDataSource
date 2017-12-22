/**
 * Created by jiuzhou.zhang on 2017/9/19.
 */

'use strict'

import { OrderedMap, Map, is, fromJS } from 'immutable'

class ListDataSource {
  _display = false
  _root = OrderedMap()
  _list = null

  display () {
    this._display = true
  }

  _lastData

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

  setHidden (keypath, hidden) {
    const item = this._getItem(keypath)
    if (item) {
      this._setRoot(this._setItem(keypath, null, item.set('hidden', hidden)))
    }
  }

  getItemCount (keypath = null) {
    return this._numberOfItems(keypath)
  }

  addGroup (keypath, { hidden = false } = {}) {
    const item = this._getItem(keypath)
    if (!item) {
      this._setRoot(this._setItem(keypath, 'group', {hidden, 'children': OrderedMap()}))
    }
  }

  resetGroup (keypath = null) {
    if (!keypath) {
      this._setRoot(OrderedMap())
    } else {
      const item = this._getItem(keypath)
      if (item && item.get('type') === 'group') {
        this._setRoot(this._setItem(keypath, null, item.set('children', OrderedMap())))
      }
    }
  }

  getComponent (keypath) {
    const item = this._getItem(keypath)
    if (item && item.get('type') === 'component') {
      return item
    }
  }

  addOrUpdateComponent (keypath, {component = null, hidden = false, ...props}, position = 'end') {
    const item = this._getItem(keypath)

    props.key = keypath.join('.')

    if (item) { // update
      if (item.get('type') === 'component') {
        this._setRoot(this._setItem(keypath, 'component', {props}))
      }
    } else {
      if (keypath.length > 1) {
        const groupItem = this._getItem(keypath.slice(0, -1))
        if (groupItem && groupItem.get('type') === 'group') {
          this._setRoot(this._setItem(keypath, 'component', {hidden, component, props}, position))
        }
      } else {
        this._setRoot(this._setItem(keypath, 'component', {hidden, component, props}, position))
      }
    }
  }

  deleteComponent (keypath) {
    this._setRoot(this._deleteItem(keypath, 'component'))
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

  _setRoot (newRoot) {
    if (newRoot !== this._root) {
      this._root = newRoot
      this._list = null
    }
  }

  _numberOfItems (keypath = null, map = this._root) {
    if (!keypath) {
      return this._root.size
    } else {
      const key = keypath[0]

      if (keypath.length > 1) {
        const subMap = map.get(key)
        if (subMap && subMap.get('type') === 'group') {
          return this._numberOfItems(keypath.slice(1), subMap.get('children'))
        }
      } else {
        let item = map.get(key)
        if (item.get('type') === 'group') {
          return item.get('children').size
        }
      }
    }

    return 0
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

  _setItem (keypath, type, attrs = {}, position = 'end', map = this._root) {
    const key = keypath[0]

    if (keypath.length > 1) {
      const subMap = map.get(key)
      if (subMap) {
        if (subMap.get('type') === 'group') {
          map = map.update(key, v => {
            v = v.set('children', this._setItem(keypath.slice(1), type, attrs, position, subMap.get('children')))
            return v
          })
        }
      }
    } else {
      let item
      if (Map.isMap(attrs)) {
        item = attrs
      } else {
        item = map.get(key)
        if (item) {
          item = item.mergeWith(
            (oldVal, newVal) => {
              const mergedVal = {...oldVal, ...newVal}
              return is(fromJS(oldVal), fromJS(mergedVal)) ? oldVal : mergedVal
            },
            Map(attrs))
        } else {
          item = new Map({ type, ...attrs })
        }
      }

      switch (position) {
        case 'end':
          map = map.set(key, item)
          break
        case 'front':
          map = OrderedMap({[key]: item}).concat(map)
          break
      }
    }

    return map
  }

  _deleteItem (keypath, type, map = this._root) {
    const key = keypath[0]

    if (keypath.length > 1) {
      const subMap = map.get(key)
      if (subMap) {
        if (subMap.get('type') === 'group') {
          map = map.update(key, v => v.set('children',
            this._deleteItem(keypath.slice(1), type, subMap.get('children'))))
        }
      }
    } else {
      let item = map.get(key)
      if (item.get('type') === type) {
        map = map.remove(key)
      }
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
