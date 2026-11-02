import type { RoomThemeId, ThemeId } from '../../../shared/theme-tokens'
import hearthRoom from '../assets/rooms/hearth-inn.png'
import rainRoom from '../assets/rooms/rainy-cabin.png'
import studyRoom from '../assets/rooms/candlelit-study.png'
import candleFlame from '../assets/rooms/candle-flame.png'
import hearthFlame from '../assets/rooms/hearth-flame.png'

export type RoomScene = {
  image: string
  width: number
  height: number
  flame: {
    image: string
    kind: 'hearth' | 'candle'
    /** Coordinates in the source background, before its uniform scale to viewport height. */
    x: number
    y: number
    width: number
    height: number
  }
}

export const ROOM_SCENES: Record<RoomThemeId, RoomScene> = {
  'hearth-inn': {
    image: hearthRoom, width: 1599, height: 984,
    flame: { image: hearthFlame, kind: 'hearth', x: -22, y: 564, width: 112, height: 134 }
  },
  'rainy-cabin': {
    image: rainRoom, width: 1536, height: 1024,
    flame: { image: candleFlame, kind: 'candle', x: 7, y: 356, width: 44, height: 60 }
  },
  'candlelit-study': {
    image: studyRoom, width: 1599, height: 984,
    flame: { image: candleFlame, kind: 'candle', x: 33, y: 52, width: 44, height: 60 }
  }
}

export function roomSceneFor(id: ThemeId): RoomScene | undefined {
  return id in ROOM_SCENES ? ROOM_SCENES[id as RoomThemeId] : undefined
}
