/**
 * We needed some logic to resize the canvas to match the display size.
 * This can get very complicated very quickly, and there is a great article
 * about this that the code below was taken from and then:
 *
 * 1. Updated to TypeScript.
 * 2. Simplified to support a more generic usecase.
 *
 * @see https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
 */
interface DrawFn {
  (displayWidth: number, displayHeight: number): void
}
export interface ResizeFunction {
  (canvas: HTMLCanvasElement, drawFn: DrawFn): void
}
function setupCanvas(canvas: HTMLCanvasElement, resizeFn: ResizeFunction) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const drawFn: DrawFn = (displayWidth, displayHeight) => {
    canvas.width = displayWidth
    canvas.height = displayHeight
  }
  resizeFn(canvas, drawFn)
}

export function registerDprCanvas(
  canvas: HTMLCanvasElement,
  initialSize: [number, number]
) {
  let dprSupport = false
  setupCanvas(canvas, (canvas, drawFn) => {
    const canvasToDisplaySizeMap = new Map([[canvas, initialSize]])
    // const dprSupportElem = document.querySelector('#dpr-support')

    const resizeAndDraw = () => {
      const canvasSize = canvasToDisplaySizeMap.get(canvas)
      if (!canvasSize) return
      drawFn(...canvasSize)
    }

    function onResize(entries: ResizeObserverEntry[]) {
      for (const entry of entries) {
        let width
        let height
        let dpr = window.devicePixelRatio
        if (entry.devicePixelContentBoxSize) {
          // NOTE: Only this path gives the correct answer
          // The other paths are an imperfect fallback
          // for browsers that don't provide anyway to do this
          width = entry.devicePixelContentBoxSize[0].inlineSize
          height = entry.devicePixelContentBoxSize[0].blockSize
          dpr = 1 // it's already in width and height
          dprSupport = true
        } else if (entry.contentBoxSize) {
          if (entry.contentBoxSize[0]) {
            width = entry.contentBoxSize[0].inlineSize
            height = entry.contentBoxSize[0].blockSize
            // } else {
            //   // legacy
            //   width = entry.contentBoxSize.inlineSize
            //   height = entry.contentBoxSize.blockSize
          }
        } else {
          // legacy
          width = entry.contentRect.width
          height = entry.contentRect.height
        }
        if (!width || !height) {
          console.error('Could not get width/height from ResizeObserver')
          return
        }
        const displayWidth = Math.round(width * dpr)
        const displayHeight = Math.round(height * dpr)
        canvasToDisplaySizeMap.set(entry.target as HTMLCanvasElement, [
          displayWidth,
          displayHeight,
        ])
        resizeAndDraw()
        // dprSupportElem.textContent = dprSupport
        //   ? 'dpr supported 😀'
        //   : 'dpr not supported 😢'
        // dprSupportElem.classList.toggle('bad', !dprSupport)
      }
    }

    resizeAndDraw()
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvas, { box: 'content-box' })
  })
  console.info(
    `Your device ${
      dprSupport ? 'supports' : 'does not support'
    } devicePixelContentBoxSize.`
  )
}
