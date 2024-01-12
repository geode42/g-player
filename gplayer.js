import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js'
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.mjs'

/**
 * Returns an HTML element
 * @param { string } tagname
 * @param { { class?: string | string[], id?: string, text?: string, html?: string } } options 
 * @returns { HTMLElement }
 */
function createElement(tagname, options) {
	const element = document.createElement(tagname)
	if (options) {
		if (typeof options.class == 'string') element.className = options.class
		if (typeof options.class == 'object') element.className = options.class.join(' ')
		if (options.id) element.id = options.id
		if (options.text) element.textContent = options.text
		if (options.html) element.html = options.html
	}

	return element
}

function formatTime(time) {
	const hours = Math.floor(time / 3600)
	const minutes = Math.floor((time - hours * 3600) / 60)
	const seconds = Math.floor(time - hours * 3600 - minutes * 60)
	return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`
}

function parseSRT(srt) {
	const parseSRTTimecode = timecode => {
		const [ hours, minutes, seconds, milliseconds ] = timecode.split(/:|,/g).map(i => parseInt(i))
		return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
	}
	const blocks = srt.split('\n\n').filter(i => i).map(block => block.split('\n').map(line => line.trim()))
	
	const subtitles = []
	for (const block of blocks) {
		const [ start, end ] = block[1].split('-->').map(i => parseSRTTimecode(i.trim()))
		const text = block[2]
		subtitles.push({ start, end, text })
	}

	return subtitles
}

class GPlayer extends HTMLElement {
	static observedAttributes = ['src', 'sub']
	
	options
	#subtitleObjects
	#subtitles = false
	#subtitlesButton
	#videoElement
	#fullscreen
	#playPauseButton
	#muteButton
	#fullscreenButton
	#playing
	#muted
	#updateHideControls
	#updateTimeInfo
	#ended = false

	// Aliases for the HTML attribute,
	// attributeChangedCallback below handles the changing
	get src() { return this.getAttribute('src') }
	set src(newValue) { this.setAttribute('src', newValue) }

	get sub() { return this.getAttribute('sub') }
	set sub(newValue) { this.setAttribute('sub', newValue) }

	#updateFullscreen() {
		if (this.#fullscreen) {
			this.requestFullscreen()
			this.#fullscreenButton.classList.add('fullscreen')
			this.#fullscreenButton.classList.remove('not-fullscreen')
		} else {
			if (document.fullscreenElement) document.exitFullscreen()
			this.#fullscreenButton.classList.add('not-fullscreen')
			this.#fullscreenButton.classList.remove('fullscreen')
		}
	}
	get fullscreen() { return this.#fullscreen }
	set fullscreen(newValue) {
		this.#fullscreen = newValue
		this.#updateFullscreen()
	}
	toggleFullscreen() { this.fullscreen = !this.fullscreen }

	#updatePlayPaused() {
		if (this.#playing) {
			this.#videoElement.play()
			this.#playPauseButton.classList.add('playing')
			this.#playPauseButton.classList.remove('paused')
		} else {
			this.#videoElement.pause()
			this.#playPauseButton.classList.add('paused')
			this.#playPauseButton.classList.remove('playing')
		}
		this.#updateHideControls()
	}
	get playing() { return this.#playing }
	set playing(newValue) { this.#playing = newValue; this.#updatePlayPaused() }
	togglePlayPaused() {
		this.playing = !this.playing
	}

	#updateMuted() {
		if (this.#muted) {
			this.#videoElement.muted = true
			this.#muteButton.classList.add('muted')
			this.#muteButton.classList.remove('not-muted')
		} else {
			this.#videoElement.muted = false
			this.#muteButton.classList.add('not-muted')
			this.#muteButton.classList.remove('muted')
		}
	}
	get muted() { return this.#muted }
	set muted(newValue) { this.#muted = newValue; this.#updateMuted() }
	toggleMute() {
		this.muted = !this.muted
	}

	#updateSubtitles() {
		if (this.#subtitles) {
			this.#subtitlesButton.classList.add('subtitles-enabled')
			this.#subtitlesButton.classList.remove('subtitles-disabled')
		} else {
			this.#subtitlesButton.classList.add('subtitles-disabled')
			this.#subtitlesButton.classList.remove('subtitles-enabled')
		}
	}
	get subtitles() { return this.#subtitles }
	set subtitles(newValue) { this.#subtitles = newValue; this.#updateSubtitles() }
	toggleSubtitles() {
		this.subtitles = !this.subtitles
	}

	/* ----------------------------- Seekbar Preview ---------------------------- */

	#seekbarPreviewImages = []

	async #renderSeekBarPreviewImages() {
		this.#seekbarPreviewImages = []
		const imageCount = Math.floor(this.#videoElement.duration / this.options.previewImageInterval)

		const video = createElement('video')
		video.src = this.#videoElement.src
		const size = this.options.previewImageMaxSize.width / this.#videoElement.videoWidth < this.options.previewImageMaxSize.height / this.#videoElement.videoHeight ?
			{ width: this.options.previewImageMaxSize.width, height: this.options.previewImageMaxSize.width / this.#videoElement.videoWidth * this.#videoElement.videoHeight }
			: { width: this.options.previewImageMaxSize.height / this.#videoElement.videoHeight * this.#videoElement.videoWidth, height: this.options.previewImageMaxSize.height }


		// resize video to output size
		video.width = size.width
		video.height = size.height

		// create canvas
		const canvas = createElement('canvas')
		canvas.width = size.width
		canvas.height = size.height
		const ctx = canvas.getContext('2d')

		for (let i = 0; i < imageCount; i++) {
			const timecode = this.#videoElement.duration - this.#videoElement.duration / (imageCount - 1) * (imageCount - 1 - i) - 1
			video.currentTime = timecode
			// Wait for the frame to load
			// loadeddata seems to only fire once, so polling is used instead
			await new Promise(r => {
				setInterval(() => {
					if (video.readyState >= 2) r()
				}, 10);
			})
	
			ctx.drawImage(video, 0, 0, size.width, size.height)
			this.#seekbarPreviewImages.push({ timecode, image: canvas.toDataURL() })
		}
	}

	/* -------------------------------------------------------------------------- */
	
	constructor() {
		super()
		this.#videoElement = document.createElement('video')
		this.#videoElement.currentTime = 40
		this.options = {
			doubleClickDuration: 250,
			hideControlsTimeout: 1500,
			previewImageInterval: 5,
			previewImageMaxSize: { width: 960, height: 540 },
		}
	}

	connectedCallback() {
		this.tabIndex = true
		
		const gradientBottom = createElement('div', { class: 'gradient-bottom' })

		const controlsContainer = createElement('div', { class: 'controls-container' })
		this.append(this.#videoElement, gradientBottom, controlsContainer)

		/* -------------------------------- Seek Bar -------------------------------- */
		const seekBarClickArea = createElement('div', { class: 'seek-bar-click-area' })
		const seekBarContainer = createElement('div', { class: 'seek-bar-container' })
		const seekBarWatched = createElement('div', { class: 'seek-bar-watched seek-bar' })
		const seekBarRemaining = createElement('div', { class: 'seek-bar-remaining seek-bar' })
		const seekBarThumb = createElement('div', { class: 'seek-bar-thumb' })
		seekBarContainer.append(seekBarWatched, seekBarRemaining, seekBarThumb, seekBarClickArea)
		controlsContainer.append(seekBarContainer)

		const updateSeekBar = () => {
			seekBarWatched.style.width = `${seekBarContainer.offsetWidth * this.#videoElement.currentTime / this.#videoElement.duration}px`
			seekBarThumb.style.left = seekBarWatched.style.width
		}

		let scrubbing = false

		const updateScrubbing = e => {
			if (!scrubbing) return
			const newCompletedPortion = (e.clientX - seekBarContainer.getBoundingClientRect().left) / seekBarContainer.offsetWidth
			this.#videoElement.currentTime = this.#videoElement.duration * newCompletedPortion
			seekBarThumb.style.left = `${newCompletedPortion * seekBarContainer.offsetWidth}px`
			updateSeekBar()
			this.#updateTimeInfo()
			updateseekBarPopover((e.clientX - seekBarContainer.getBoundingClientRect().left) / seekBarContainer.offsetWidth * this.#videoElement.duration)
		}

		seekBarClickArea.addEventListener('mousedown', e => {
			scrubbing = true
			seekBarContainer.classList.add('seeking')
			updateScrubbing(e)
		})

		document.addEventListener('mouseup', e => {
			scrubbing = false
			seekBarContainer.classList.remove('seeking')
			updateScrubbing(e)
		})

		document.addEventListener('mousemove', updateScrubbing)

		this.#videoElement.addEventListener('timeupdate', e => {
			updateSeekBar()
		})
		updateSeekBar()

		/* ---------------------------- Seek Bar Popover ---------------------------- */
		const seekBarPopover = createElement('div', { class: 'seek-bar-popover' })
		const seekBarPreview = createElement('img', { class: 'seek-bar-preview' })
		const seekBarTimecode = createElement('div', { class: 'seek-bar-timecode' })

		seekBarPreview.src = ''

		seekBarPopover.append(seekBarTimecode, seekBarPreview)
		seekBarContainer.append(seekBarPopover)

		const updateseekBarPopover = (timecode) => {
			for (const frame of this.#seekbarPreviewImages) {
				if (frame.timecode >= timecode) {
					seekBarPreview.src = frame.image
					break
				}
			}
			seekBarTimecode.textContent = formatTime(timecode)
		}

		seekBarContainer.addEventListener('mousemove', e => {
			updateseekBarPopover((e.clientX - seekBarContainer.getBoundingClientRect().left) / seekBarContainer.offsetWidth * this.#videoElement.duration)
			let pos = (e.clientX - seekBarContainer.getBoundingClientRect().left)
			if (pos < seekBarPreview.offsetWidth / 2) {
				pos = seekBarPreview.offsetWidth / 2
			}
			if (pos > seekBarContainer.offsetWidth - seekBarPreview.offsetWidth / 2) {
				pos = seekBarContainer.offsetWidth - seekBarPreview.offsetWidth / 2
			}
			seekBarPopover.style.left = `${pos}px`
		})


		/* --------------------------- Video element ended -------------------------- */
		this.#videoElement.addEventListener('ended', e => {
			this.#ended = true
			this.playing = false // the html video element pauses itself when it ends
			this.#updateHideControls()
		})
		this.#videoElement.addEventListener('timeupdate', e => {
			this.#ended = false
		})

		/* ------------------------------ Hide Controls ----------------------------- */
		let hideControlsTimeout

		const updateHideControls = () => {
			controlsContainer.classList.remove('hidden')
			clearTimeout(hideControlsTimeout)
			hideControlsTimeout = setTimeout(() => {
				if (!this.playing) return  // don't hide if paused
				if (this.#ended) return  // don't hide if ended
				controlsContainer.classList.add('hidden')
			}, this.options.hideControlsTimeout)
		}

		this.#updateHideControls = updateHideControls

		this.addEventListener('mousemove', e => updateHideControls())
		updateHideControls()

		/* ----------------------------- Lower Controls ----------------------------- */
		const lowerControlsContainer = createElement('div', { class: 'lower-controls-container' })
		const lowerControlsContainerLeft = createElement('div')
		const lowerControlsContainerRight = createElement('div')
		controlsContainer.append(lowerControlsContainer)
		lowerControlsContainer.append(lowerControlsContainerLeft, lowerControlsContainerRight)
		
		this.#playPauseButton = createElement('button', { class: 'play-pause-button' })
		this.#playPauseButton.addEventListener('click', e => this.togglePlayPaused())
		
		this.#muteButton = createElement('button', { class: 'mute-button' })
		this.#muteButton.addEventListener('click', e => this.toggleMute())

		this.#fullscreenButton = createElement('button', { class: 'fullscreen-button' })
		this.#fullscreenButton.addEventListener('click', e => this.toggleFullscreen())

		this.#subtitlesButton = createElement('button', { class: 'subtitles-button' })
		this.#subtitlesButton.addEventListener('click', e => this.toggleSubtitles())

		const timeInfoContainer = createElement('div', { class: 'time-info-container' })
		const timeCurrentSpan = createElement('span')
		const timeSeparatorSpan = createElement('span', { text: '/', class: 'separator' })
		const timeDurationSpan = createElement('span')
		timeInfoContainer.append(timeCurrentSpan, timeSeparatorSpan, timeDurationSpan)

		const updateTimeInfo = () => {
			timeCurrentSpan.textContent = formatTime(this.#videoElement.currentTime)
			timeDurationSpan.textContent = formatTime(this.#videoElement.duration)
		}
		this.#updateTimeInfo = updateTimeInfo

		this.#videoElement.addEventListener('timeupdate', e => {
			updateTimeInfo()
		})
		updateTimeInfo()

		lowerControlsContainerLeft.append(this.#playPauseButton, this.#muteButton, timeInfoContainer)
		lowerControlsContainerRight.append(this.#subtitlesButton, this.#fullscreenButton)

		/* ---------------------------------- Misc ---------------------------------- */
		// css didn't work for some reason
		const setVideoSize = () => {
			this.#videoElement.style.width = `${this.getBoundingClientRect().width}px`
			this.#videoElement.style.height = `${this.getBoundingClientRect().height}px`
		}
		
		new ResizeObserver(e => {
			setVideoSize()
			updateSeekBar()
		}).observe(this)

		setVideoSize()

		this.#updatePlayPaused()
		this.#updateMuted()
		this.#updateFullscreen()
		this.#updateSubtitles()
		
		/* ------------------------------ Player click ------------------------------ */
		let lastClickTime = 0
		let playPauseTimeout
		this.#videoElement.addEventListener('mousedown', e => {
			if (e.buttons != 1) return
			this.#updateHideControls()
			clearTimeout(playPauseTimeout)
			if (Date.now() - lastClickTime <= this.options.doubleClickDuration) {
				this.toggleFullscreen()
				return
			}
			lastClickTime = Date.now()
			playPauseTimeout = setTimeout(() => {
				this.togglePlayPaused()
			}, this.options.doubleClickDuration)
		})

		/* -------------------------------- Keyboard -------------------------------- */
		this.addEventListener('keydown', e => {
			this.#updateHideControls()
			switch (e.key) {
				case ' ':
					if (document.activeElement.tagName == 'BUTTON') return  // if a button is focused space clicks it
					this.togglePlayPaused()
					break;
				case 'k':
					this.togglePlayPaused()
					break;
				case 'm':
					this.toggleMute()
					break;
				case 'f':
					this.toggleFullscreen()
					break;
				case 'c':
					this.toggleSubtitles()
					break;
				case 'Escape':
					this.fullscreen = false
					break;
				case 'ArrowLeft':
					this.#videoElement.currentTime -= 5
					break;
				case 'ArrowRight':
					this.#videoElement.currentTime += 5
					break;
				case 'j':
					this.#videoElement.currentTime -= 10
					break;
				case 'l':
					this.#videoElement.currentTime += 10
					break;
				
				default:
					break;
			}
		})

		/* -------------------------------- Subtitles ------------------------------- */
		const subtitleContainer = createElement('div', { class: 'subtitle-container' })
		this.append(subtitleContainer)

		const updateSubtitles = () => {
			subtitleContainer.innerHTML = ''

			if (this.#subtitles) {
				for (const subtitle of this.#subtitleObjects) {
					if (this.#videoElement.currentTime >= subtitle.start && this.#videoElement.currentTime < subtitle.end) {
						subtitleContainer.innerHTML = DOMPurify.sanitize(marked.parse(subtitle.text))
						break
					}
				}
			}
			requestAnimationFrame(updateSubtitles)
		}

		requestAnimationFrame(updateSubtitles)
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'src':
				this.#videoElement.src = newValue
				const videoElementLoadedListener = this.#videoElement.addEventListener('loadeddata', () => {
					this.#renderSeekBarPreviewImages()
				})
				this.#videoElement.removeEventListener('loadeddata', videoElementLoadedListener)
				break
			case 'sub':
				fetch(newValue).then(i => i.text().then(i => this.#subtitleObjects = parseSRT(i)) )
				break
			default:
				break
		}
	}

}

customElements.define('g-player', GPlayer)
