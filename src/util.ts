// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => void>(
    func: T,
    timeout: number = 300
): ((...args: Parameters<T>) => void) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    return (...args: Parameters<T>): void => {
        if (!timer) func.apply(this, args)
        clearTimeout(timer)
        timer = setTimeout(() => {
            timer = undefined
        }, timeout)
    }
}
