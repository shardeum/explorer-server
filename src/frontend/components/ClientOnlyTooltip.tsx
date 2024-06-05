import React, { useEffect, useState } from 'react'
import ReactTooltip from 'react-tooltip'

const ClientOnlyTooltip = ({ id, backgroundColor, effect }): JSX.Element => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true);
  }, [])

  return (
    <>
      {isMounted && (
          <ReactTooltip id={id} effect={effect} backgroundColor={backgroundColor} />
      )}
    </>
  )
}

export default ClientOnlyTooltip;