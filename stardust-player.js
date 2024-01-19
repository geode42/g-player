import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js'
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.mjs'

/**
 * Returns an HTML element
 * @param { string } tagname
 * @param { {
 *     class?: string | string[],
 *     id?: string,
 *     text?: string,
 *     html?: string,
 *     children?: HTMLElement[]
 * } } options 
 * @returns { HTMLElement }
 */
function createElement(tagname, options) {
	const element = document.createElement(tagname)
	if (options) {
		if (typeof options.class == 'string') element.className = options.class
		if (options.class && typeof options.class.join == 'function') element.className = options.class.join(' ')
		if (options.id) element.id = options.id
		if (options.text) element.textContent = options.text
		if (options.html) element.innerHTML = options.html
		if (options.children) element.replaceChildren(...options.children)
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

function clamp(min, n, max) {
	return Math.min(Math.max(n, min), max)
}

function HTMLStringToElement(HTMLString) {
	return new DOMParser().parseFromString(HTMLString, 'text/html').body.childNodes[0]
}

const icons = {
	play: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M320-200v-560l440 280-440 280Z"/></svg>'),
	pause: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z"/></svg>'),
	volumeUp: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320Z"/></svg>'),
	volumeOff: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Z"/></svg>'),
	fullscreen: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M120-120v-200h80v120h120v80H120Zm520 0v-80h120v-120h80v200H640ZM120-640v-200h200v80H200v120h-80Zm640 0v-120H640v-80h200v200h-80Z"/></svg>'),
	fullscreenExit: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M240-120v-120H120v-80h200v200h-80Zm400 0v-200h200v80H720v120h-80ZM120-640v-80h120v-120h80v200H120Zm520 0v-200h80v120h120v80H640Z"/></svg>'),
	closedCaptions: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M200-160q-33 0-56.5-23.5T120-240v-480q0-33 23.5-56.5T200-800h560q33 0 56.5 23.5T840-720v480q0 33-23.5 56.5T760-160H200Zm80-200h120q17 0 28.5-11.5T440-400v-40h-60v20h-80v-120h80v20h60v-40q0-17-11.5-28.5T400-600H280q-17 0-28.5 11.5T240-560v160q0 17 11.5 28.5T280-360Zm280 0h120q17 0 28.5-11.5T720-400v-40h-60v20h-80v-120h80v20h60v-40q0-17-11.5-28.5T680-600H560q-17 0-28.5 11.5T520-560v160q0 17 11.5 28.5T560-360Z"/></svg>'),
	closedCaptionsDisabled: () => HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24"><path d="M819-28 687-160H200q-33 0-56.5-23.5T120-240v-487l-93-93 57-57L876-85l-57 57Zm21-207L706-369q7-5 10.5-13.5T720-400v-40h-60v20h-5l-75-75v-45h80v20h60v-40q0-17-11.5-28.5T680-600H560q-17 0-28.5 11.5T520-560v5L275-800h485q33 0 56.5 23.5T840-720v485ZM280-360h120q17 0 28.5-11.5T440-400v-7l-33-33h-27v20h-80v-127l-45-45q-7 5-11 13.5t-4 18.5v160q0 17 11.5 28.5T280-360Z"/></svg>'),
}

class StardustSeekBar extends HTMLElement {
	videoElement
	initialized
	#watched
	#preview
	#seeking = false

	get seeking() { return this.#seeking }

	constructor() {
		super()

		this.videoElement
		this.initialized = false
	}

	updateBar(currentTime) {
		this.#watched.style.width = `${this.getBoundingClientRect().width * currentTime / this.videoElement.duration}px`
	}

	get previewImageSrc() { return this.#preview.src }
	set previewImageSrc(value) { this.#preview.src = value }

	connectedCallback() {
		if (this.initialized) return
		this.initialized = true
		/* -------------------------------- Seek Bar -------------------------------- */
		const watched = createElement('div', { class: 'seek-bar-watched seek-bar' })
		const remaining = createElement('div', { class: 'seek-bar-remaining seek-bar' })
		const thumb = createElement('div', { class: 'seek-bar-thumb' })
		const clickArea = createElement('div', { class: 'seek-bar-click-area' })
		this.append(watched, thumb, remaining, clickArea)
		
		this.#watched = watched

		let scrubbing = false

		const updateScrubbing = e => {
			if (!scrubbing) return
			const event = new Event('timechange')
			event.time = this.videoElement.duration * (e.clientX - this.getBoundingClientRect().left) / this.getBoundingClientRect().width
			this.dispatchEvent(event)
		}

		clickArea.addEventListener('pointerdown', e => {
			scrubbing = true
			this.#seeking = true
			this.classList.add('seeking')
			updateScrubbing(e)

			const event = new Event('seekingchange')
			event.seeking = this.#seeking
			this.dispatchEvent(event)
		})

		document.addEventListener('pointerup', e => {
			if (!scrubbing) return
			scrubbing = false
			this.#seeking = false
			this.classList.remove('seeking')
			updateScrubbing(e)

			const event = new Event('seekingchange')
			event.seeking = this.#seeking
			this.dispatchEvent(event)
		})

		document.addEventListener('pointermove', updateScrubbing)

		/* ---------------------------- Seek Bar Popover ---------------------------- */
		const popover = createElement('div', { class: 'seek-bar-popover' })
		const preview = createElement('img', { class: 'seek-bar-preview' })
		const timecode = createElement('div', { class: 'seek-bar-timecode' })

		this.#preview = preview

		preview.src = ''

		popover.append(timecode, preview)
		this.append(popover)

		document.addEventListener('pointermove', e => {
			const { left, width } = this.getBoundingClientRect()
			if (this.offsetWidth + this.offsetHeight == 0) return  // if the seekbar isn't being displayed (for example, with display none)
			const previewTime = clamp(0, e.clientX - left, width) / width * this.videoElement.duration
			const event = new Event('previewtimechange')
			event.time = previewTime
			this.dispatchEvent(event)
			let pos = (e.clientX - left)
			if (pos < preview.getBoundingClientRect().width / 2) {
				pos = preview.getBoundingClientRect().width / 2
			}
			if (pos > width - preview.getBoundingClientRect().width / 2) {
				pos = width - preview.getBoundingClientRect().width / 2
			}
			popover.style.left = `${pos}px`

			timecode.textContent = formatTime(previewTime)
		})
	}
}

class StardustPlayer extends HTMLElement {
	static observedAttributes = ['src', 'sub']

	options
	#videoElement
	#paused = true
	#muted = false
	#subtitles = false
	#fullscreen = false
	#ended = false
	#seekBarPreviewTimecode
	#updateHideControls
	#subtitleObjects
	#screenIsTouched = false

	// Aliases for the HTML attribute,
	// attributeChangedCallback below handles the changing
	get src() { return this.getAttribute('src') }
	set src(newValue) { this.setAttribute('src', newValue) }

	get sub() { return this.getAttribute('sub') }
	set sub(newValue) { this.setAttribute('sub', newValue) }

	// Pause
	#updatePaused() {
		this.#paused ? this.#videoElement.pause() : this.#videoElement.play()
		this.classList.toggle('paused', this.#paused)
		this.#updateHideControls()
	}
	get paused() { return this.#paused }
	set paused(newValue) { this.#paused = newValue; this.#updatePaused() }
	togglePaused() { this.paused = !this.paused }
	// Mute
	#updateMuted() {
		this.#videoElement.muted = this.#muted
		this.classList.toggle('muted', this.#muted)
	}
	get muted() { return this.#muted }
	set muted(newValue) { this.#muted = newValue; this.#updateMuted() }
	toggleMute() { this.muted = !this.muted }
	// Subtitles
	#updateSubtitles() {
		this.classList.toggle('subtitles', this.#subtitles)
	}
	get subtitles() { return this.#subtitles }
	set subtitles(newValue) { this.#subtitles = newValue; this.#updateSubtitles() }
	toggleSubtitles() { this.subtitles = !this.subtitles }
	// Fullscreen
	async #updateFullscreen() {
		if (this.#fullscreen) {
			await this.requestFullscreen()
			screen.orientation.lock('landscape')
		} else {
			document.fullscreenElement && document.exitFullscreen()
			screen.orientation.unlock()
		}
		this.classList.toggle('fullscreen', this.#fullscreen) 
	}
	get fullscreen() { return this.#fullscreen }
	set fullscreen(newValue) { this.#fullscreen = newValue; this.#updateFullscreen() }
	toggleFullscreen() { this.fullscreen = !this.fullscreen }

	/* ----------------------------- Seekbar Preview ---------------------------- */

	#seekbarPreviewImages = []

	async #renderSeekBarPreviewImages() {
		this.#seekbarPreviewImages = []

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

		const renderAndApplyPreviewImage = async timecode => {
			video.currentTime = timecode
			// Wait for the frame to load
			// loadeddata seems to only fire once, so polling is used instead
			await new Promise(r => {
				setInterval(() => video.readyState >= 2 && r(), 10);
			})
	
			ctx.drawImage(video, 0, 0, size.width, size.height)
			this.#seekbarPreviewImages.push({ timecode, image: canvas.toDataURL('image/webp', 50) })
			this.#seekbarPreviewImages.sort((a, b) => a.timecode > b.timecode)
		}


		await renderAndApplyPreviewImage(this.#videoElement.duration)
		for (let i = 1; i <= this.options.previewImageIterations; i++) {
			const firstTimecode = this.#videoElement.duration / Math.pow(2, i)
			for (let t = firstTimecode; t < this.#videoElement.duration; t += firstTimecode * 2) {
				await renderAndApplyPreviewImage(t)
			}
		}
	}

	/* -------------------------------------------------------------------------- */
	
	constructor() {
		super()

		this.#videoElement = document.createElement('video')
		this.tabIndex = true

		// this.classList.add('mobile')

		this.options = {
			doubleClickDuration: 250,
			doubleTapJumpDuration: 500,
			doubleTapJumpDistance: 5,
			doubleTapJumpScreenPortion: 0.2,
			hideControlsTimeout: 1500,
			hideControlsTimeoutMobile: 3000,
			previewImageIterations: 8,
			previewImageMaxSize: { width: 480, height: 270 },
		}
	}

	connectedCallback() {
		const gradientBottom = createElement('div', { class: 'gradient-bottom' })
		const controlsContainer = createElement('div', { class: 'controls-container' })
		const mobileControlsContainer = createElement('div', { class: 'mobile-controls-container' })
		this.append(this.#videoElement, gradientBottom, controlsContainer, mobileControlsContainer)


		/* -------------------------------- Seek Bar -------------------------------- */
		const seekBar = createElement('stardust-seekbar', { class: 'controls' })
		seekBar.videoElement = this.#videoElement
		controlsContainer.append(seekBar)
		seekBar.addEventListener('timechange', e => this.#videoElement.currentTime = e.time)
		seekBar.addEventListener('previewtimechange', e => this.#seekBarPreviewTimecode = e.time)
		seekBar.addEventListener('seekingchange', e => {
			(e.seeking || this.#paused) ? this.#videoElement.pause() : this.#videoElement.play()
			this.#updateHideControls()
		})

		/* --------------------------- Video element ended -------------------------- */
		this.#videoElement.addEventListener('ended', e => {
			this.#ended = true
			this.paused = true // the html video element pauses itself when it ends
			this.#updateHideControls()
		})
		this.#videoElement.addEventListener('timeupdate', e => {
			this.#ended = false
		})

		/* ------------------------------ Hide Controls ----------------------------- */
		let hideControlsTimeout

		this.#updateHideControls = () => {
			this.classList.remove('controls-hidden')
			setTimeout(() => {
				if (!this.#screenIsTouched) {
					this.classList.remove('no-click')
				}
			}, 1);
			clearTimeout(hideControlsTimeout)
			hideControlsTimeout = setTimeout(() => {
				if (this.paused) return  // don't hide if paused
				if (this.#ended) return  // don't hide if ended
				this.classList.add('controls-hidden')
				this.classList.add('no-click')
			}, this.classList.contains('mobile') ? this.options.hideControlsTimeoutMobile : this.options.hideControlsTimeout)
		}

		this.addEventListener('pointermove', e => {
			if (e.pointerType == 'mouse') {
				this.#updateHideControls()
			}
		})
		this.#updateHideControls()

		/* ----------------------------- Lower Controls ----------------------------- */
		const lowerControlsContainer = createElement('div', { class: 'lower-controls-container' })
		const lowerControlsContainerLeft = createElement('div')
		const lowerControlsContainerRight = createElement('div')
		controlsContainer.append(lowerControlsContainer)
		lowerControlsContainer.append(lowerControlsContainerLeft, lowerControlsContainerRight)
		
		const playPauseButton = createElement('button', { class: 'play-pause-button', children: [ icons.pause(), icons.play() ] })
		playPauseButton.addEventListener('click', () => this.togglePaused())
		
		const muteButton = createElement('button', { class: 'mute-button', children: [ icons.volumeUp(), icons.volumeOff() ] })
		muteButton.addEventListener('click', () => this.toggleMute())

		const fullscreenButton = createElement('button', { class: 'fullscreen-button', children: [ icons.fullscreen(), icons.fullscreenExit() ] })
		fullscreenButton.addEventListener('click', () => this.toggleFullscreen())

		const subtitlesButton = createElement('button', { class: 'subtitles-button', children: [ icons.closedCaptions(), icons.closedCaptionsDisabled() ] })
		subtitlesButton.addEventListener('click', () => this.toggleSubtitles())

		const timeInfoContainer = createElement('div', { class: 'time-info-container' })
		const timeCurrentSpan = createElement('span')
		const timeSeparatorSpan = createElement('span', { text: '/', class: 'separator' })
		const timeDurationSpan = createElement('span')
		timeInfoContainer.append(timeCurrentSpan, timeSeparatorSpan, timeDurationSpan)

		lowerControlsContainerLeft.append(playPauseButton, muteButton, timeInfoContainer)
		lowerControlsContainerRight.append(subtitlesButton, fullscreenButton)

		/* ----------------------------- Mobile Controls ---------------------------- */
		const mobileLowerControls = createElement('div', { class: 'lower-controls' })
		const mobileAboveSeekbarControls = createElement('div', { class: 'above-seekbar-controls' })
		const mobileUpperControls = createElement('div', { class: 'upper-controls' })

		mobileControlsContainer.append(mobileLowerControls, mobileUpperControls)
		mobileLowerControls.append(mobileAboveSeekbarControls)

		const mobilePlayPauseButton = createElement('button', { class: 'play-pause-button', children: [ icons.pause(), icons.play() ] })
		mobilePlayPauseButton.addEventListener('click', () => this.togglePaused())
		mobileControlsContainer.append(mobilePlayPauseButton)

		const mobileTimeInfoContainer = createElement('div', { class: 'time-info-container' })
		const mobileTimeCurrentSpan = createElement('span')
		const mobileTimeSeparatorSpan = createElement('span', { text: '/', class: 'separator' })
		const mobileTimeDurationSpan = createElement('span')
		mobileTimeInfoContainer.append(mobileTimeCurrentSpan, mobileTimeSeparatorSpan, mobileTimeDurationSpan)

		const mobileFullscreen = createElement('button', { class: 'fullscreen-button', children: [ icons.fullscreen(), icons.fullscreenExit() ] })
		mobileFullscreen.addEventListener('click', () => this.toggleFullscreen())

		mobileAboveSeekbarControls.append(mobileTimeInfoContainer, mobileFullscreen)

		const mobileSeekBar = createElement('stardust-seekbar')
		mobileSeekBar.videoElement = this.#videoElement
		mobileLowerControls.append(mobileSeekBar)
		mobileSeekBar.addEventListener('timechange', e => this.#videoElement.currentTime = e.time)
		mobileSeekBar.addEventListener('previewtimechange', e => this.#seekBarPreviewTimecode = e.time)
		mobileSeekBar.addEventListener('seekingchange', e => {
			(e.seeking || this.#paused) ? this.#videoElement.pause() : this.#videoElement.play()
			this.#updateHideControls()
		})


		const mobileSubtitlesButton = createElement('button', { class: 'subtitles-button', children: [ icons.closedCaptions(), icons.closedCaptionsDisabled() ] })
		mobileSubtitlesButton.addEventListener('click', () => this.toggleSubtitles())
		mobileUpperControls.append(mobileSubtitlesButton)

		/* ---------------------------------- Misc ---------------------------------- */
		// css didn't work for some reason
		const setVideoSize = () => {
			this.#videoElement.style.width = `${this.getBoundingClientRect().width}px`
			this.#videoElement.style.height = `${this.getBoundingClientRect().height}px`
		}
		
		new ResizeObserver(e => {
			setVideoSize()
		}).observe(this)

		setVideoSize()

		this.#updatePaused()
		
		/* ------------------------------ Player click ------------------------------ */
		// Handles click-to-pause and double-click-for-fullscreen for mouse inputs
		let lastClickTime = 0
		let lastTapTime = 0
		let playPauseTimeout
		let tapJumpTimeout
		this.#videoElement.addEventListener('pointerdown', e => {
			if (e.pointerType == 'mouse') {
				if (e.buttons != 1) return
				this.#updateHideControls()
				clearTimeout(playPauseTimeout)
				if (Date.now() - lastClickTime <= this.options.doubleClickDuration) {
					this.toggleFullscreen()
					return
				}
				lastClickTime = Date.now()
				playPauseTimeout = setTimeout(() => {
					this.togglePaused()
				}, this.options.doubleClickDuration)
			} else {
				const portion = (e.clientX - this.offsetLeft) / this.offsetWidth
				const direction = portion <= this.options.doubleTapJumpScreenPortion ? 'l' : (portion >= 1 - this.options.doubleTapJumpScreenPortion ? 'r' : '')
				clearTimeout(tapJumpTimeout)
				if (direction) {
					if (Date.now() - lastTapTime <= this.options.doubleTapJumpDuration) {
						this.#videoElement.currentTime += direction == 'r' ? this.options.doubleTapJumpDistance : -this.options.doubleTapJumpDistance
					} else {
						tapJumpTimeout = setTimeout(() => {
							if (this.classList.contains('controls-hidden')) {
								this.#updateHideControls()
							} else {
								this.classList.add('controls-hidden')
								this.classList.add('no-click')
							}
						}, this.options.doubleTapJumpDuration)
					}
					lastTapTime = Date.now()
				} else {
					if (this.classList.contains('controls-hidden')) {
						this.#updateHideControls()
					} else {
						this.classList.add('controls-hidden')
						this.classList.add('no-click')
					}
				}
			}
		})

		// Hack to fix bug where pointerdown causes UI to show and pointerup causese playpause button to click
		this.#videoElement.addEventListener('pointerdown', e => {
			this.#screenIsTouched = true
		})
		this.#videoElement.addEventListener('pointerup', e => {
			this.#screenIsTouched = false
			setTimeout(() => {
				if (!(this.classList.contains('controls-hidden'))) {
					this.classList.remove('no-click')
				}
			}, 1);
		})

		/* -------------------------------- Keyboard -------------------------------- */
		this.addEventListener('keydown', e => {
			this.#updateHideControls()
			switch (e.key) {
				case ' ':
					if (document.activeElement.tagName == 'BUTTON') return  // if a button is focused space clicks it
					this.togglePaused()
					break;
				case 'k':
					this.togglePaused()
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

		const animationLoop = () => {
			// Seek bar
			seekBar.updateBar(this.#videoElement.currentTime)
			mobileSeekBar.updateBar(this.#videoElement.currentTime)
			// Seek bar popover
			for (const frame of this.#seekbarPreviewImages) {
				if (frame.timecode >= this.#seekBarPreviewTimecode) {
					seekBar.previewImageSrc = frame.image
					mobileSeekBar.previewImageSrc = frame.image
					break
				}
			}

			// Time info
			timeCurrentSpan.textContent = formatTime(this.#videoElement.currentTime)
			timeDurationSpan.textContent = formatTime(this.#videoElement.duration)
			mobileTimeCurrentSpan.textContent = formatTime(this.#videoElement.currentTime)
			mobileTimeDurationSpan.textContent = formatTime(this.#videoElement.duration)

			// Subtitles
			let newSubtitles = ''
			if (this.#subtitles) {
				for (const subtitle of this.#subtitleObjects) {
					if (this.#videoElement.currentTime >= subtitle.start && this.#videoElement.currentTime < subtitle.end) {
						newSubtitles = DOMPurify.sanitize(marked.parse(subtitle.text))
						break
					}
				}
			}
			if (subtitleContainer.innerHTML != newSubtitles) subtitleContainer.innerHTML = newSubtitles
			requestAnimationFrame(animationLoop)
		}

		requestAnimationFrame(animationLoop)
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

customElements.define('stardust-seekbar', StardustSeekBar)
customElements.define('stardust-player', StardustPlayer)
