import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StepperStep {
  id: number;
  title: string;
  description?: string;
  icon: React.ReactNode;
}

export interface MinimalStepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
}

const MinimalStepper = React.forwardRef<HTMLDivElement, MinimalStepperProps>(
  ({ steps, currentStep, className }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div className="flex items-center justify-center">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isPending = currentStep < step.id;

            return (
              <React.Fragment key={step.id}>
                {/* Step Item */}
                <div className="flex flex-col items-center relative">
                  {/* Circle Container */}
                  <div className="relative">
                    {/* Pulsing ring for current step */}
                    {isCurrent && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                        <div className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse" />
                      </>
                    )}

                    {/* Main Circle */}
                    <div
                      className={cn(
                        "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                        isCompleted && "bg-primary border-primary text-primary-foreground scale-100",
                        isCurrent && "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/50",
                        isPending && "bg-muted border-muted-foreground/30 text-muted-foreground"
                      )}
                      style={{
                        transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {isCompleted ? (
                        <Check 
                          className="w-5 h-5 animate-[scale-in_0.3s_ease-out]" 
                          strokeWidth={3} 
                        />
                      ) : (
                        <span className="[&>svg]:w-5 [&>svg]:h-5 transition-transform duration-300">
                          {step.icon}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <div
                    className={cn(
                      "mt-3 text-center transition-all duration-500",
                      isCurrent ? "opacity-100 translate-y-0" : "opacity-0 sm:opacity-100 translate-y-1 sm:translate-y-0"
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-semibold transition-all duration-300",
                        isCurrent && "text-primary",
                        isCompleted && "text-foreground",
                        isPending && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </p>
                    
                    {/* Current step badge */}
                    {isCurrent && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full animate-fade-in">
                        Paso actual
                      </span>
                    )}
                    
                    {/* Completed badge */}
                    {isCompleted && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                        ✓ Listo
                      </span>
                    )}

                    {step.description && isCurrent && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[120px] animate-fade-in">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector Line with Progress Animation */}
                {index < steps.length - 1 && (
                  <div className="relative flex-1 mx-3 sm:mx-4 max-w-[80px] sm:max-w-[100px] h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                    {/* Animated progress bar */}
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700 ease-out",
                        currentStep > step.id ? "w-full" : "w-0"
                      )}
                    />
                    
                    {/* Shimmer effect for current step's line */}
                    {isCurrent && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{currentStep}</span>
            <span>de</span>
            <span className="font-medium text-foreground">{steps.length}</span>
            <span className="text-muted-foreground">pasos</span>
          </div>
        </div>
      </div>
    );
  }
);

MinimalStepper.displayName = "MinimalStepper";

export { MinimalStepper };
