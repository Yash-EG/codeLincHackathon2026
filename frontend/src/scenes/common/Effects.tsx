import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

/**
 * Gentle screen-space ambient occlusion (N8AO, half resolution) for the soft,
 * pooled shadows of a clay diorama, then tone mapping and SMAA.
 */
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes aoRadius={0.6} distanceFalloff={0.5} intensity={2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  )
}
