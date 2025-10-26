declare module '@dnd-kit/core' {
  export const DndContext: any
  export const closestCenter: any
  export type DragEndEvent = any
  // Shims adicionais para uso no mobile/desktop
  export const useSensors: any
  export const useSensor: any
  export const MouseSensor: any
  export const TouchSensor: any
}

declare module '@dnd-kit/sortable' {
  export const SortableContext: any
  export const verticalListSortingStrategy: any
  export const useSortable: any
  export const arrayMove: any
}

declare module '@dnd-kit/utilities' {
  export const CSS: any
}
