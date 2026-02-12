import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface PasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    showPassword?: boolean
    onTogglePassword?: () => void
    label?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, type, showPassword = false, onTogglePassword, ...props }, ref) => {
        const [show, setShow] = React.useState(showPassword)

        // Allow controlled state if onTogglePassword is provided, otherwise local state
        const isVisible = onTogglePassword ? showPassword : show
        const toggleVisibility = () => {
            if (onTogglePassword) {
                onTogglePassword()
            } else {
                setShow(!show)
            }
        }

        return (
            <div className="relative">
                <Input
                    type={isVisible ? "text" : "password"}
                    className={cn("pr-10", className)}
                    ref={ref}
                    {...props}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={toggleVisibility}
                    disabled={props.disabled}
                >
                    {isVisible ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                        {isVisible ? "Hide password" : "Show password"}
                    </span>
                </Button>
            </div>
        )
    }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
