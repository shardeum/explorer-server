import React, { useEffect, useState } from 'react'
import styles from './NetworkMode.module.scss'
import ReactTooltip from 'react-tooltip'
import { Modes } from '../../types/modes'

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
    tooltipContent: 'Processing',
  },
  [Modes.Safety]: {
    color: '#e74c3c',
    tooltipContent: 'Safety',
  },
  [Modes.Forming]: {
    color: '#3498db',
    tooltipContent: 'Forming',
  },
  [Modes.Recovery]: {
    color: '#f39c12',
    tooltipContent: 'Recovery',
  },
  [Modes.Restore]: {
    color: '#8e44ad',
    tooltipContent: 'Restore',
  },
  [Modes.Shutdown]: {
    color: '#d35400',
    tooltipContent: 'Shutdown',
  },
  [Modes.Restart]: {
    color: '#27ae60',
    tooltipContent: 'Restart',
  },
}

const getColorAndTooltip = (mode: Modes | undefined): ModeData => {
  if (mode) {
    return modeData[mode as Modes]
  }
  return { color: '', tooltipContent: '' }
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
      <ReactTooltip id="tooltip" place="top" type="dark" effect="solid" />
    </div>
  )
}

export default NetworkMode
