import React, { useEffect, useState } from 'react'
import styles from './NetworkMode.module.scss'
import ReactTooltip from 'react-tooltip'
import { Modes } from '../../types/modes'
import ClientOnlyTooltip from '../../components/ClientOnlyTooltip'

interface ModeComponentProps {
  mode: Modes | undefined
}

interface ModeData {
  color: string
  tooltipContent: string
}

const modeData: Record<Modes, ModeData> = {
  [Modes.Processing]: {
    color: '#10c90e',
    tooltipContent: 'Processing: The network processes application transactions. Nodes can be rotated.',
  },
  [Modes.Safety]: {
    color: '#e74c3c',
    tooltipContent: 'Safety: Only protocol transactions are processed.',
  },
  [Modes.Forming]: {
    color: '#3498db',
    tooltipContent:
      'Forming: The network allows nodes to join, sync, and go active until a minimum number of active nodes is achieved.',
  },
  [Modes.Recovery]: {
    color: '#f39c12',
    tooltipContent:
      'Recovery: The network stops processing application transactions and nodes stop syncing, but still handle protocol data.',
  },
  [Modes.Restore]: {
    color: '#8e44ad',
    tooltipContent: 'Restore: Nodes sync data from Archivers and other nodes, going active once synced.',
  },
  [Modes.Shutdown]: {
    color: '#d35400',
    tooltipContent:
      'Shutdown: All transactions stop being processed and nodes exit the network after a short period.',
  },
  [Modes.Restart]: {
    color: '#27ae60',
    tooltipContent:
      'Restart: The network allows nodes to join without syncing or going active until a minimum total node count is reached.',
  },
}

const getColorAndTooltip = (mode: Modes | undefined): ModeData => {
  if (mode) {
    return modeData[mode as Modes]
  }
  // Provide default values for color and tooltipContent when mode is undefined
  return { color: '#cccccc', tooltipContent: 'No mode selected' }
}

const NetworkMode: React.FC<ModeComponentProps> = ({ mode }) => {
  const { color, tooltipContent } = getColorAndTooltip(mode)
  const [ringShadowColor, setRingShadowColor] = useState(color)

  useEffect(() => {
    setRingShadowColor(color)
  }, [color])

  const containerStyle = {
    '--ring-shadow-color': ringShadowColor,
  } as React.CSSProperties

  return (
    <div className={styles.modeContainer}>
      <div
        className={styles.modeCircle}
        style={containerStyle}
        id="mode-circle"
        data-tip={tooltipContent}
        data-for="tooltip"
      ></div>
      <ClientOnlyTooltip id="tooltip" backgroundColor="#6610f2" effect="solid" />
    </div>
  )
}

export default NetworkMode
