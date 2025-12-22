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
                  {/* Circle */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isCurrent && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30",
                      isPending && "bg-muted border-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : (
                      <span className="[&>svg]:w-5 [&>svg]:h-5">{step.icon}</span>
                    )}
                  </div>

                  {/* Label - Only show for current step on mobile, all on desktop */}
                  <div
                    className={cn(
                      "mt-3 text-center transition-all duration-300",
                      isCurrent ? "opacity-100" : "opacity-0 sm:opacity-100"
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-semibold transition-colors",
                        isCurrent && "text-primary",
                        isCompleted && "text-foreground",
                        isPending && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </p>
                    {step.description && isCurrent && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[120px]">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4 transition-all duration-300 rounded-full max-w-[100px]",
                      currentStep > step.id + 1 ? "bg-primary" : 
                      currentStep > step.id ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);

MinimalStepper.displayName = "MinimalStepper";

export { MinimalStepper };
