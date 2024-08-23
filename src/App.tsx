// import "./App.css"

import React, { useCallback } from "react"

interface Body {
  // Center of mass, for easier calculations
  name: string
  x: number
  y: number
  width: number
  height: number
  mass: number
  // In Newtons
  engineForceVector: {
    x: number
    y: number
  }
  accelerationVector: {
    x: number
    y: number
  }
  velocityVector: {
    x: number
    y: number
  }
}

const RADIUS_OF_EARTH = 6371 * 1000
const MASS_OF_EARTH = 5.972e24
const G = 6.674e-11
const SCALE_FACTOR = 10000
const FRAME_DURATION = 100
const SPEED_SCALE_FACTOR = 10

// The earth
const FrameOfReference = {
  x: 0,
  y: 0,
  mass: MASS_OF_EARTH,
  // Width and height are cosmetic, because the radius of the earth is not included.
  width: RADIUS_OF_EARTH * 2,
  height: RADIUS_OF_EARTH * 2,
}

const convertToCssPosition = (position: {
  x: number
  y: number
  width: number
  height: number
}) => {
  return {
    // Considering the center of mass
    top: 1000 - (position.y + position.height / 2) / SCALE_FACTOR,
    left: 650 + (position.x - position.width / 2) / SCALE_FACTOR,
  }
}

const recalculatePositions = (
  bodies: Body[],
  deltaTime: number,
  isEngineOn: boolean,
): Body[] => {
  return bodies.map((body) => {
    const distanceToEarth = {
      x: FrameOfReference.x - body.x,
      y: FrameOfReference.y - body.y,
    }
    const absoluteDistanceToEarth = Math.sqrt(
      distanceToEarth.x ** 2 + distanceToEarth.y ** 2,
    )

    const absoluteGravitationalForce =
      (G * MASS_OF_EARTH * body.mass) / absoluteDistanceToEarth ** 2

    const cosineTheta = distanceToEarth.x / absoluteDistanceToEarth
    const sineTheta = distanceToEarth.y / absoluteDistanceToEarth

    const gravitationalForce = {
      x: absoluteGravitationalForce * cosineTheta,
      y: absoluteGravitationalForce * sineTheta,
    }

    const newAcceleration = {
      x:
        (isEngineOn
          ? body.engineForceVector.x + gravitationalForce.x
          : 0 + gravitationalForce.x) / body.mass,
      y:
        (isEngineOn
          ? body.engineForceVector.y + gravitationalForce.y
          : 0 + gravitationalForce.y) / body.mass,
    }

    const newVelocity = {
      x:
        ((newAcceleration.x + body.accelerationVector.x) * deltaTime) / 2 +
        body.velocityVector.x,
      y:
        ((newAcceleration.y + body.accelerationVector.y) * deltaTime) / 2 +
        body.velocityVector.y,
    }

    const newPosition = {
      x: ((newVelocity.x + body.velocityVector.x) * deltaTime) / 2 + body.x,
      y: ((newVelocity.y + body.velocityVector.y) * deltaTime) / 2 + body.y,
    }

    return {
      ...body,
      accelerationVector: newAcceleration,
      velocityVector: newVelocity,
      x: newPosition.x,
      y: newPosition.y,
    }
  })
}

function App() {
  const [bodies, setBodies] = React.useState<Body[]>([
    {
      name: "Rocket",
      x: 0,
      y: RADIUS_OF_EARTH + 10000,
      width: 20000,
      height: 20000,
      mass: 7000,
      engineForceVector: {
        x: 0,
        y: 100000,
      },
      accelerationVector: {
        x: 0,
        y: 0,
      },
      velocityVector: {
        x: 0,
        y: 0,
      },
    },
  ])
  const [traces, setTraces] = React.useState<
    {
      x: number
      y: number
      width: number
      height: number
    }[]
  >([])
  const [frame, setFrame] = React.useState(0)
  const [isEngineOn, setIsEngineOn] = React.useState(true)
  const [timerId, setTimerId] = React.useState<NodeJS.Timeout | null>(null)

  const toPreviousFrame = useCallback(() => {
    setBodies((prevBodies) =>
      recalculatePositions(prevBodies, -FRAME_DURATION / 1000, isEngineOn),
    )
    setFrame((prevFrame) => prevFrame - 1)
  }, [isEngineOn])

  const rewind = () => {
    const timer = setInterval(
      toPreviousFrame,
      FRAME_DURATION / SPEED_SCALE_FACTOR,
    )
    setTimerId(timer)
  }

  const toNextFrame = useCallback(() => {
    setBodies((prevBodies) =>
      recalculatePositions(prevBodies, FRAME_DURATION / 1000, isEngineOn),
    )
    setFrame((prevFrame) => prevFrame + 1)
  }, [isEngineOn])

  const fastForward = () => {
    const timer = setInterval(toNextFrame, FRAME_DURATION / SPEED_SCALE_FACTOR)
    setTimerId(timer)
  }

  const pause = () => {
    if (timerId) {
      clearInterval(timerId)
      setTimerId(null)
    }
  }

  return (
    <div className="App">
      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
          }}
        >
          <button onClick={() => rewind()}>&lt;&lt;</button>
          <button onClick={() => toPreviousFrame()}>Previous Frame</button>
          <button onClick={pause}>Pause</button>
          <button onClick={() => toNextFrame()}>Next Frame</button>
          <button onClick={() => fastForward()}>&gt;&gt;</button>
        </div>
        <div>
          <button
            onClick={() => {
              pause()
              setIsEngineOn(false)
            }}
          >
            Stop Engine
          </button>
        </div>
        <div>
          <p>Frame: {frame}</p>
          <p>Time: {(frame * FRAME_DURATION) / 1000}</p>
          <p>Speed: {SPEED_SCALE_FACTOR}x</p>
        </div>
        {bodies.map((body, index) => {
          return (
            <div key={index}>
              <p>{body.name}</p>
              <p>x: {body.x}</p>
              <p>y: {body.y}</p>
              <p>
                y (to earth, km):{" "}
                {(body.y - RADIUS_OF_EARTH - body.height / 2) / 1000}
              </p>
              <p>Acceleration.x: {body.accelerationVector.x}</p>
              <p>Acceleration.y: {body.accelerationVector.y}</p>
              <p>Velocity.x (m/s): {body.velocityVector.x}</p>
              <p>Velocity.y (m/s): {body.velocityVector.y}</p>
            </div>
          )
        })}
      </div>

      {/* Bodies */}
      <div
        style={{
          position: "relative",
        }}
      >
        {/* Frame of reference, earth */}
        <div
          style={{
            position: "absolute",
            width: FrameOfReference.width / SCALE_FACTOR,
            height: FrameOfReference.height / SCALE_FACTOR,
            borderRadius: RADIUS_OF_EARTH / SCALE_FACTOR,
            backgroundColor: "brown",
            ...convertToCssPosition(FrameOfReference),
          }}
        />
        {traces.map((trace, index) => {
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                width: "5px",
                height: "5px",
                backgroundColor: "gray",
                ...convertToCssPosition(trace),
              }}
            />
          )
        })}
        {bodies.map((body, index) => {
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                width: body.width / SCALE_FACTOR,
                height: body.height / SCALE_FACTOR,
                backgroundColor: "red",
                ...convertToCssPosition(body),
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default App
