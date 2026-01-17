import * as React from "react"

export function useIsTouch() {
    const [isTouch, setIsTouch] = React.useState<boolean | undefined>(undefined)

    React.useEffect(() => {
        // (pointer: coarse) is the standard way to detect touch-primary devices
        const mql = window.matchMedia("(pointer: coarse)")
        const onChange = () => {
            setIsTouch(mql.matches)
        }
        mql.addEventListener("change", onChange)
        setIsTouch(mql.matches)
        return () => mql.removeEventListener("change", onChange)
    }, [])

    return !!isTouch
}
