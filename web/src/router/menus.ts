import {
  Box,
  DataLine,
  Goods,
  List,
  Monitor,
  Odometer,
  Setting,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'

const menuIcons: Record<string, Component> = {
  Odometer,
  Goods,
  List,
  Box,
  DataLine,
  Monitor,
  Setting,
}

export function menuIcon(name: string) {
  return menuIcons[name]
}
