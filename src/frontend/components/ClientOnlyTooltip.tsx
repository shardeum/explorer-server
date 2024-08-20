import React, { useEffect, useState } from 'react'
import ReactTooltip from 'react-tooltip'

/**
 * ClientOnlyTooltip is a React component that renders a tooltip using ReactTooltip.
 * It ensures that the tooltip is only mounted and rendered on the client side after the component has mounted.
 * This is useful for components that rely on window or document objects, which are not available during server-side rendering.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.id - The unique identifier for the tooltip, used for accessibility and linking the tooltip with its trigger.
 * @param {string} props.backgroundColor - The background color of the tooltip.
 * @param {string} props.effect - The effect used to display the tooltip, e.g., 'float', 'solid'.
 * @returns {JSX.Element} The tooltip component, which renders conditionally based on whether the component is mounted.
 */
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