/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import useInterval from '@use-it/interval'

import { HeadComponent as Head } from 'components/Head'
import { registerDprCanvas } from 'components/lib/resize-utils'

/**
 * Easter Eggs:
 * `portal` : Konami Code (up, up, down, down, left, right, left, right)
 */

type Apple = {
  x: number
  y: number
}

type Velocity = {
  dx: number
  dy: number
}

export default function SnakeGame() {
  // Canvas Settings
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasWidth = 500
  const canvasHeight = 380
  const canvasGridSize = 20

  // Game Settings
  const minGameSpeed = 5
  const maxGameSpeed = 10

  // Game State
  const [easterEggs, setEasterEggs] = useState({
    portal: false,
  })
  const [started, setStarted] = useState(false)
  const [gameDelay, setGameDelay] = useState<number>(1000 / minGameSpeed)
  const [countDown, setCountDown] = useState<number>(4)
  const [running, setRunning] = useState(false)
  const [isLost, setIsLost] = useState(false)
  const [highscore, setHighscore] = useState(0)
  const [newHighscore, setNewHighscore] = useState(false)
  const [score, setScore] = useState(0)
  const [snake, setSnake] = useState<{
    head: { x: number; y: number }
    trail: Array<any>
  }>({
    head: { x: 12, y: 9 },
    trail: [],
  })
  const [apple, setApple] = useState<Apple>({ x: -1, y: -1 })
  const [velocity, setVelocity] = useState<Velocity>({ dx: 0, dy: 0 })
  const [previousVelocity, setPreviousVelocity] = useState<Velocity>({
    dx: 0,
    dy: 0,
  })
  const [pointerEvent, setPointerEvent] = useState<PointerEvent | null>(null)
  const [isTouching, setIsTouching] = useState(false)
  /**
   * secret codes can be a max of 8 moves in a row, but can be less.
   * They need to only be directional so we can support mouse, touch, and arrow
   * events.
   */
  const [easterEggCodeBuffer, setEasterEggCodeBuffer] = useState<string[]>([])
  const addInputToEasterEggCodeBuffer = useCallback((input: string) => {
    setEasterEggCodeBuffer((prevBuffer) => {
      const newBuffer = [...prevBuffer, input]
      if (newBuffer.length > 8) {
        newBuffer.shift()
      }
      return newBuffer
    })
  }, [])

  useEffect(() => {
    const secretCode = easterEggCodeBuffer.join('')
    console.log(`secretCode: `, secretCode)
    // if (!easterEggs.portal && secretCode === 'upupdowndownleftrightleftright') {
    if (!easterEggs.portal && secretCode.startsWith('upupdowndown')) {
      console.log('Konami Code entered!')
      setEasterEggCodeBuffer([])
      setEasterEggs((prevEggs) => {
        console.log('Easter Egg "portal" is enabled!')
        return {
          ...prevEggs,
          portal: true,
        }
      })
    }
  }, [easterEggCodeBuffer, easterEggs])
  // clear the easter egg code buffer after 1 second if no input is received
  // within that time
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setEasterEggCodeBuffer([])
    }, 1000)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [easterEggCodeBuffer])

  const clearCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(-1, -1, canvasWidth + 2, canvasHeight + 2)

    if (easterEggs.portal) {
      const wallAlpha = 0.5
      const wallThickness = 1
      const wallShadowOffset = 5
      // draw "portals" on sides of the canvas to indicate that
      // the snake will teleport to the other side of the board.
      ctx.shadowBlur = 5
      ctx.fillStyle = `rgba(39, 167, 216, ${wallAlpha})`
      ctx.strokeStyle = `rgba(39, 167, 216, ${wallAlpha})`
      ctx.shadowColor = 'rgba(39, 167, 216, 1)'
      ctx.shadowOffsetX = wallShadowOffset
      ctx.strokeRect(-1, 0, wallThickness, canvasHeight) // left side
      ctx.shadowOffsetX = -wallShadowOffset
      ctx.fillRect(canvasWidth - 1, -1, wallThickness, canvasHeight) // right side
      ctx.shadowOffsetY = wallShadowOffset
      ctx.fillRect(-1, -1, canvasWidth + 1, wallThickness) // top side
      ctx.shadowOffsetY = -wallShadowOffset
      ctx.fillRect(-1, canvasHeight + 1, canvasWidth - 1, wallThickness) // bottom side
    }

    // undo the shadow settings
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.shadowBlur = 0
    ctx.shadowColor = 'rgba(0, 0, 0, 0)'
  }

  const generateApplePosition = (): Apple => {
    const x = Math.floor(Math.random() * (canvasWidth / canvasGridSize))
    const y = Math.floor(Math.random() * (canvasHeight / canvasGridSize))
    // Check if random position interferes with snake head or trail
    if (
      (snake.head.x === x && snake.head.y === y) ||
      snake.trail.some((snakePart) => snakePart.x === x && snakePart.y === y)
    ) {
      return generateApplePosition()
    }
    return { x, y }
  }

  // Initialise state and start countdown
  const startGame = () => {
    setStarted(true)
    setGameDelay(1000 / minGameSpeed)
    setIsLost(false)
    setScore(0)
    setSnake({
      head: { x: 12, y: 9 },
      trail: [],
    })
    setApple(generateApplePosition())
    setVelocity({ dx: 0, dy: -1 })
    setRunning(true)
    setNewHighscore(false)
    setCountDown(3)
  }
  const pauseToggle = () => setRunning((prevRunning) => !prevRunning)

  // Reset state and check for highscore
  const gameOver = () => {
    if (score > highscore) {
      setHighscore(score)
      localStorage.setItem('highscore', score.toString())
      setNewHighscore(true)
    }
    setIsLost(true)
    setRunning(false)
    setVelocity({ dx: 0, dy: 0 })
    setCountDown(4)
  }

  const fillRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.fillRect(x, y, w, h)
  }

  const strokeRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.strokeRect(x + 0.5, y + 0.5, w, h)
  }
  const canvasEl = canvasRef.current
  useEffect(() => {
    if (canvasEl) {
      registerDprCanvas(canvasEl, [canvasWidth, canvasHeight])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // do NOT add canvasEl to the dependency array, or we will get an infinite loop

  const drawSnake = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#0170F3'
      ctx.strokeStyle = '#003779'

      // make the snake head a little bigger than the rest of the snake

      fillRect(
        ctx,
        snake.head.x * canvasGridSize - 1,
        snake.head.y * canvasGridSize - 1,
        canvasGridSize + 2,
        canvasGridSize + 2
      )

      strokeRect(
        ctx,
        snake.head.x * canvasGridSize - 1,
        snake.head.y * canvasGridSize - 1,
        canvasGridSize + 2,
        canvasGridSize + 2
      )

      snake.trail.forEach((snakePart) => {
        fillRect(
          ctx,
          snakePart.x * canvasGridSize,
          snakePart.y * canvasGridSize,
          canvasGridSize,
          canvasGridSize
        )

        strokeRect(
          ctx,
          snakePart.x * canvasGridSize,
          snakePart.y * canvasGridSize,
          canvasGridSize,
          canvasGridSize
        )
      })
    },
    [snake]
  )

  const drawApple = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#DC3030' // '#38C172' // '#F4CA64'
      ctx.strokeStyle = '#881A1B' // '#187741' // '#8C6D1F

      if (
        apple &&
        typeof apple.x !== 'undefined' &&
        typeof apple.y !== 'undefined'
      ) {
        fillRect(
          ctx,
          apple.x * canvasGridSize,
          apple.y * canvasGridSize,
          canvasGridSize,
          canvasGridSize
        )

        strokeRect(
          ctx,
          apple.x * canvasGridSize,
          apple.y * canvasGridSize,
          canvasGridSize,
          canvasGridSize
        )
      }
    },
    [apple]
  )

  // Update snake.head, snake.trail and apple positions. Check for collisions.
  const updateSnake = () => {
    // Check for collision with walls
    const nextHeadPosition = {
      x: snake.head.x + velocity.dx,
      y: snake.head.y + velocity.dy,
    }
    const minX = 0
    const maxX = canvasWidth / canvasGridSize - 1
    const minY = 0
    const maxY = canvasHeight / canvasGridSize - 1
    if (
      nextHeadPosition.x < 0 ||
      nextHeadPosition.y < 0 ||
      nextHeadPosition.x > maxX ||
      nextHeadPosition.y > maxY
    ) {
      if (easterEggs.portal === true) {
        if (nextHeadPosition.x < 0) {
          nextHeadPosition.x = maxX // need the NEW x value on the other side of the board
        } else if (nextHeadPosition.y < 0) {
          nextHeadPosition.y = maxY
        } else if (nextHeadPosition.y > maxY) {
          nextHeadPosition.y = minY
        } else if (nextHeadPosition.x > maxX) {
          nextHeadPosition.x = minX
        }
      } else {
        gameOver()
      }
    }

    // Check for collision with apple
    if (nextHeadPosition.x === apple.x && nextHeadPosition.y === apple.y) {
      setScore((prevScore) => prevScore + 1)
      setApple(generateApplePosition())
    }

    const updatedSnakeTrail = [...snake.trail, { ...snake.head }]
    // Remove trail history beyond snake trail length (score + 2)
    while (updatedSnakeTrail.length > score + 2) updatedSnakeTrail.shift()
    // Check for snake colliding with itsself
    if (
      updatedSnakeTrail.some(
        (snakePart) =>
          snakePart.x === nextHeadPosition.x &&
          snakePart.y === nextHeadPosition.y
      )
    )
      gameOver()

    // Update state
    setPreviousVelocity({ ...velocity })
    setSnake({
      head: { ...nextHeadPosition },
      trail: [...updatedSnakeTrail],
    })
  }

  // Game Hook
  const gameLoop = useCallback(() => {
    const canvas = canvasRef?.current
    const ctx = canvas?.getContext('2d')
    let rafId: number | null = null
    if (canvas != null && ctx != null && !isLost) {
      rafId = requestAnimationFrame(gameLoop)
      clearCanvas(ctx)
      drawApple(ctx)
      drawSnake(ctx)
    }
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [drawApple, drawSnake, isLost])

  useEffect(() => {
    gameLoop()
  }, [gameLoop])

  // Game Update Interval
  useInterval(
    () => {
      if (!isLost) {
        // TODO: move into gameLoop with logic to handle keep game at the same speed (using gameDelay)
        updateSnake()
      }
    },
    running && countDown === 0 ? gameDelay : null
  )

  // Countdown Interval
  useInterval(
    () => {
      setCountDown((prevCountDown) => prevCountDown - 1)
    },
    countDown > 0 && countDown < 4 ? 800 : null
  )

  // DidMount Hook for Highscore
  useEffect(() => {
    setHighscore(
      localStorage.getItem('highscore')
        ? parseInt(localStorage.getItem('highscore')!)
        : 0
    )
  }, [])

  // Score Hook: increase game speed starting at 16
  useEffect(() => {
    if (score > minGameSpeed && score <= maxGameSpeed) {
      setGameDelay(1000 / score)
    }
  }, [score])

  const setDirectionUp = useCallback(() => {
    addInputToEasterEggCodeBuffer('up')
    if (previousVelocity.dy !== 1) {
      setVelocity({ dx: 0, dy: -1 })
    }
  }, [addInputToEasterEggCodeBuffer, previousVelocity])
  const setDirectionDown = useCallback(() => {
    addInputToEasterEggCodeBuffer('down')
    if (previousVelocity.dy !== -1) {
      setVelocity({ dx: 0, dy: 1 })
    }
  }, [addInputToEasterEggCodeBuffer, previousVelocity])
  const setDirectionLeft = useCallback(() => {
    addInputToEasterEggCodeBuffer('left')
    if (previousVelocity.dx !== 1) {
      setVelocity({ dx: -1, dy: 0 })
    }
  }, [addInputToEasterEggCodeBuffer, previousVelocity])
  const setDirectionRight = useCallback(() => {
    addInputToEasterEggCodeBuffer('right')
    if (previousVelocity.dx !== -1) {
      setVelocity({ dx: 1, dy: 0 })
    }
  }, [addInputToEasterEggCodeBuffer, previousVelocity])

  useEffect(() => {
    const preventWindowMovement = (e: TouchEvent) => {
      if (isTouching === true) {
        console.log('prevented touchMove on window')
        e.preventDefault()
      }
    }
    document.addEventListener('touchmove', preventWindowMovement, {
      passive: false,
    })
    return () => {
      document.removeEventListener('touchmove', preventWindowMovement)
    }
  }, [isTouching])

  // Event Listener: Key Presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isLost) {
        pauseToggle()
        return
      }
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'w',
          'a',
          's',
          'd',
        ].includes(e.key)
      ) {
        switch (e.key) {
          case 'ArrowRight':
          case 'd':
            setDirectionRight()
            break
          case 'ArrowLeft':
          case 'a':
            setDirectionLeft()
            break
          case 'ArrowDown':
          case 's':
            setDirectionDown()
            break
          case 'ArrowUp':
          case 'w':
            setDirectionUp()
            break
          default:
            setVelocity({ dx: 0, dy: 0 })
            console.error('Error with handleKeyDown')
        }
      }
    }
    // we need to handle swipes for mobile devices, and mouse events, so
    // we should listen for PointerEvents and determine whether they are up/down/left/right moves
    const handleTouchAndMoseDown = (e: PointerEvent) => {
      setIsTouching(true)
      setPointerEvent(e)
    }
    const handleTouchAndMouseUp = (e: PointerEvent) => {
      setIsTouching(false)

      const { clientX: newX, clientY: newY } = e
      if (pointerEvent == null) {
        console.error('pointerUp event fired without pointerDown')
        return
      }
      const { x: prevX, y: prevY } = pointerEvent
      const deltaX = newX - prevX
      const deltaY = newY - prevY
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          setDirectionRight()
        } else {
          setDirectionLeft()
        }
      } else {
        if (deltaY > 0) {
          setDirectionDown()
        } else {
          setDirectionUp()
        }
      }
    }
    const canvasElement = canvasRef.current
    document.addEventListener('keydown', handleKeyDown)
    canvasElement?.addEventListener('pointerup', handleTouchAndMouseUp)
    canvasElement?.addEventListener('pointerdown', handleTouchAndMoseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      canvasElement?.removeEventListener('pointerup', handleTouchAndMouseUp)
      canvasElement?.removeEventListener('pointerdown', handleTouchAndMoseDown)
    }
  }, [
    previousVelocity,
    isLost,
    setDirectionRight,
    setDirectionLeft,
    setDirectionDown,
    setDirectionUp,
    pointerEvent,
    isTouching,
  ])

  /**
   * Show the secret code buffer while the game is running and there is some
   * easterEgg still available to be found.
   */
  const showSecretCode =
    running &&
    !isLost &&
    easterEggCodeBuffer.length > 0 &&
    Object.values(easterEggs).some((egg) => egg === false)

  return (
    <>
      <Head />
      {showSecretCode && (
        <div className="easter-egg-code">
          <FontAwesomeIcon icon={['fas', 'skull-crossbones']} fade />
          Secret Code
          <FontAwesomeIcon icon={['fas', 'skull-crossbones']} fade />:{'  '}
          {easterEggCodeBuffer.join(', ')}
        </div>
      )}
      <main>
        <canvas
          id="game-viewport"
          ref={canvasRef}
          width={canvasWidth + 1}
          height={canvasHeight + 1}
        />
        <section>
          <div className="score">
            <p>
              <FontAwesomeIcon icon={['fas', 'star']} />
              Score: {score}
            </p>
            <p>
              <FontAwesomeIcon icon={['fas', 'trophy']} />
              Highscore: {highscore > score ? highscore : score}
            </p>
          </div>
          {!isLost && countDown > 0 ? (
            <button onClick={startGame}>
              {countDown === 4 ? 'Start Game' : countDown}
            </button>
          ) : (
            <div className="controls">
              <p>How to Play?</p>
              <p>
                <FontAwesomeIcon icon={['fas', 'arrow-up']} />
                <FontAwesomeIcon icon={['fas', 'arrow-right']} />
                <FontAwesomeIcon icon={['fas', 'arrow-down']} />
                <FontAwesomeIcon icon={['fas', 'arrow-left']} />
              </p>
            </div>
          )}
        </section>
        {isLost && (
          <div className="game-overlay">
            <p className="large">Game Over</p>
            <p className="final-score">
              {newHighscore ? `🎉 New Highscore 🎉` : `You scored: ${score}`}
            </p>
            {!running && isLost && (
              <button onClick={startGame}>
                {countDown === 4 ? 'Restart Game' : countDown}
              </button>
            )}
          </div>
        )}
        {!running &&
          started &&
          !isLost && ( // the game is paused
            <div className="game-overlay">
              <p className="large">Game Paused</p>
              <p className="final-score">{`Current score: ${score}`}</p>
            </div>
          )}
      </main>
      <footer>
        Copyright &copy; <a href="https://mueller.dev">Marc Müller</a> 2022
        &nbsp;|&nbsp;{' '}
        <a href="https://github.com/SgtPooki/next-snake">
          <FontAwesomeIcon icon={['fab', 'github']} /> Github
        </a>
      </footer>
    </>
  )
}
