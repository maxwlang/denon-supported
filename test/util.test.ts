import { debounce } from '../src/util'

describe('util', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.useRealTimers()
    })
    describe('debounce', () => {
        it('should call the function immediately on the first call', () => {
            const fn = jest.fn()
            const debouncedFn = debounce(fn, 100)

            debouncedFn()
            expect(fn).toHaveBeenCalledTimes(1)
        })

        it('should debounce subsequent calls', () => {
            const fn = jest.fn()
            const debouncedFn = debounce(fn, 100)

            debouncedFn() // Immediate call
            debouncedFn('arg1') // Debounced
            debouncedFn('arg2') // Debounced

            expect(fn).toHaveBeenCalledTimes(1) // Immediate call only

            jest.advanceTimersByTime(100)
            expect(fn).toHaveBeenCalledTimes(1) // Final call after debounce
        })

        it('should handle multiple calls correctly', () => {
            const fn = jest.fn()
            const debouncedFn = debounce(fn, 100)

            debouncedFn('first') // Immediate call
            debouncedFn('second') // Debounced

            expect(fn).toHaveBeenCalledTimes(1) // Immediate call only

            jest.advanceTimersByTime(100)

            debouncedFn('third') // Debounced
            expect(fn).toHaveBeenCalledTimes(2) // Final call after debounce
            expect(fn).toHaveBeenCalledWith('third') // Last arguments passed
        })
    })
})
