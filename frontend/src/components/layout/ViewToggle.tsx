import { useSettingsStore, useViewMode, type ViewMode } from '../../store/settingsStore'
import { announce } from '../../store/uiStore'
import SegmentedControl from '../SegmentedControl'

const OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'immersive', label: '3D office' },
  { value: 'traditional', label: 'Traditional' },
]

/** Same pages either way: "Traditional" drops the 3D layer, glass and motion. */
export default function ViewToggle() {
  const view = useViewMode()
  const setViewMode = useSettingsStore((s) => s.setViewMode)
  return (
    <SegmentedControl
      legend="View"
      name="view-mode"
      size="sm"
      hideLegend
      options={OPTIONS}
      value={view}
      onChange={(mode) => {
        setViewMode(mode)
        announce(mode === 'immersive' ? '3D office view on.' : 'Traditional view on. 3D and motion are off.')
      }}
    />
  )
}
