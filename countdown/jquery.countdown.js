/*
*
* jQuery Countdown Plugin
* Author: Gabriel D Vine
* 8/2010
*
*
*** USAGE ***
*
*    $('h1').countdown({
*        duration: 900,   // in seconds
*        layout: "Time Remaining: $h:$m:$s",
*        display2DigitMinutes: false,
*        onTick: {  // callback at a certain time
*            secondsRemaining: 898,
*            fireIfUnderTickPoint: true,
*            action: function() {
*                console.log('We have reached ' + secondsRemaining + ' seconds remaining.');
*            }
*        },
*        onExpiry: function(){  // callback after countdown to zero
*            $(this).css('color','red');
*            console.log('Countdown complete');
*        }
*    });
*
*/

(function($) {
    
    function Countdown() {
        this.defaultOptions = { 
            duration: null,
            layout: 'Time Remaining: $m:$s',
            display2DigitMinutes: false,
            onTick: null,
            onExpiry: null
        };
        
        $.extend(this.defaultOptions);
    }
    
    $.extend(Countdown.prototype, {
        
        markerClassName: 'hasCountdown',
        activeTimerTargets: [],
        sharedTimerIsSet: false,
        
        initCountdown: function(target, options) {
            var $target = $(target);
            
            if (!$target.hasClass(this.markerClassName)) {
                var instance = {
                    options: $.extend({}, options)
                };
                
                $target.addClass(this.markerClassName);
                
                $.data(target, 'countdown', instance);
                
                this.configureCountdown(target, options);
            }
        },
        
        configureCountdown: function(target, options) {
            options = options || {};
            
            var instance = $.data(target, 'countdown');
            
            if (instance) {
                this.removeExtraOptions(instance.options, options);
                this.addTarget(target, instance);                
                this.parseLayout(target, instance);
                
                $.extend(instance.options, options);
                
                this.iterateDuration(instance);
            }
        },
                
        removeExtraOptions: function(base, options) {
            $.extend(base, options);
            
            for (var option in options) {
                if (options[option] == null) {
                    base[option] = null;
                }
            }
            
            return base;
        },
        
        addTarget: function(target, instance) {
            if (!this.hasTarget(target) && instance.options.duration > 0) {
                this.activeTimerTargets.push(target);
            }
        },
        
        hasTarget: function(target) {
            return ($.inArray(target, this.activeTimerTargets) > -1);
        },
        
        parseLayout: function(target, instance) {
            if (!instance.options.layoutChunks) {
                var layoutChunks = this.initLayoutChunks(instance);
                
                this.splitLayoutChunks(instance, layoutChunks);
            }
            
            this.handleOnTick(target, instance);
            this.checkTimeLeft(target, instance);
        },
        
        initLayoutChunks: function(instance) {
            var layoutChunks = instance.options.layout.split("$");
            
            instance.options.layoutChunks = [];
            instance.options.layoutChunks[0] = ["text", layoutChunks[0]];
            
            return layoutChunks;
        },
        
        splitLayoutChunks: function(instance, layoutChunks) {
            for (i = 1; i < layoutChunks.length; i++) {
                this.populateLayoutChunks(instance, layoutChunks);
            }
            
            return instance;
        },
        
        populateLayoutChunks: function(instance, layoutChunks) {
            instance.options.layoutChunks.push([layoutChunks[i].charAt(0), layoutChunks[i].charAt(0)]);
            instance.options.layoutChunks.push(["text", layoutChunks[i].substring(1)]);
            
            return instance;
        },
        
        iterateDuration: function(instance) {
            instance.options.duration--;
            
            return instance;
        },
        
        checkTimeLeft: function(target, instance) {
            var timeIsLeft = instance.options.duration >= 0,
                noTimeIsLeft = instance.options.duration <= 0;
            
            if (timeIsLeft) {
                this.handleTimeLeft(target, instance);
            }
            
            if (noTimeIsLeft) {
                this.handleNoTimeLeft(target, instance);
            }
        },
        
        handleOnTick: function(target, instance) {
            this.setTickActionHasFired(instance);
            
            var instanceOnTick = this.getOption(instance, 'onTick');
            
            if (instanceOnTick) {
                var overTickPoint = (instanceOnTick.fireIfUnderTickPoint === false),
                    durationAtTickPoint = (instance.options.duration === instanceOnTick.secondsRemaining)
                    durationAtOrUnderTickPoint = (instance.options.duration <= instanceOnTick.secondsRemaining),
                    tickNotFired = (instance.options.tickActionHasFired == false);
                
                if (overTickPoint && durationAtTickPoint || !overTickPoint && durationAtOrUnderTickPoint && tickNotFired) {
                    this.fireOnTick(instance, target);
                }
            }
        },
        
        handleTimeLeft: function(target, instance) {
            if (!this.sharedTimerIsSet) {
                this.iterateSharedTimer();
            }
            
            this.updateTime(target, instance);
        },
        
        handleNoTimeLeft: function(target, instance) {
            this.handleOnExpiry(target, instance);
            this.removeTarget(target);
            this.handleLastTimer();
        },
        
        updateTime: function(target, instance) {        
            
            var totalSecondsRemaining = instance.options.duration,
                hoursPlace = Math.round(parseInt(totalSecondsRemaining / 3600)),
                minutesInHoursPlace = hoursPlace * 60,
                secondsInHoursPlace = hoursPlace * 3600,
                minutesRemaining = totalSecondsRemaining / 60,
                
                minutesDisplay = (hoursPlace > 0) ? parseInt(minutesRemaining - minutesInHoursPlace) : parseInt(minutesRemaining),
                secondsInMinuteDisplay = minutesDisplay * 60,
                secondsDisplay = (minutesDisplay > 0 || hoursPlace > 0) ? totalSecondsRemaining - secondsInHoursPlace - secondsInMinuteDisplay : totalSecondsRemaining,
                
                hoursIsPopulated = false,
                minutesIsPopulated = false,
                numberOfChunks = instance.options.layoutChunks.length,
                
                populateTimeFields = function() {
                    for (i = 0; i < numberOfChunks; i++) {
                        var timeLetter = instance.options.layoutChunks[i][0];
                        
                        switch (timeLetter) {
                            case "h":
                                populateHours(i);
                                break;
                            
                            case "m":
                                populateMinutes(i);
                                break;
                            
                            case "s":
                                populateSeconds(i);
                                break;
                        }
                    }
                },
                
                populateHours = function(i) {
                    instance.options.layoutChunks[i][1] = hoursPlace;
                    hoursIsPopulated = true;
                },
                
                populateMinutes = function(i) {
                    var totalMinutes = minutesDisplay + (hoursPlace * 60);
                    
                    instance.options.layoutChunks[i][1] = (!hoursIsPopulated) ? totalMinutes : minutesDisplay;
                    minutesIsPopulated = true;
                },
                
                populateSeconds = function(i) {
                    iterateSeconds(i);
                    
                    if (instance.options.display2DigitMinutes) {
                        addAught(minutesDisplay, i);
                    }
                    
                    addAught(secondsDisplay, i);
                },
                
                iterateSeconds = function(i) {
                    var onlySecondsIsPopulated = (!hoursIsPopulated && !minutesIsPopulated),
                        secondsLeft = secondsDisplay + (minutesDisplay * 60);
                    
                    instance.options.layoutChunks[i][1] = (onlySecondsIsPopulated) ? secondsLeft + secondsInHoursPlace : secondsDisplay;
                },
                
                addAught = function(timeDisplay, i) {
                    if (timeDisplay < 10) {
                        instance.options.layoutChunks[i][1] = "0" + instance.options.layoutChunks[i][1].toString();
                    }
                };
            
            populateTimeFields();
            
            this.populateLayout(target, instance);
        },
        
        handleOnExpiry: function(target, instance) {
            if (instance.options.onExpiry) {
                instance.options.onExpiry.apply(target, []);    
            }
        },
        
        removeTarget: function(target) {
            this.activeTimerTargets = $.map(this.activeTimerTargets, function(value) {
                return (value == target ? null : value);
            });
        },
        
        handleLastTimer: function() {
            if (this.activeTimerTargets.length < 1) {
                clearInterval(this.timerInterval);
                this.sharedTimerIsSet = false;
            }
        },
        
        setTickActionHasFired: function(instance) {
            if (instance.options.tickActionHasFired === undefined) {
                instance.options.tickActionHasFired = false;
            }
            
            return instance;
        },
        
        fireOnTick: function(instance, target) {
            var instanceOnTick = this.getOption(instance, 'onTick');
            
            instanceOnTick.action.apply(target);
            instance.options.tickActionHasFired = true;
            
            return instance;
        },
                
        getOption: function(instance, option) {
            return (instance.options[option] != null ? 
                instance.options[option] : $.countdown.defaultOptions[option]);
        },
        
        iterateSharedTimer: function() {
            this.timerInterval = setInterval(function(){
                $.countdown.updateTargets();
            }, 1000)
            
            this.sharedTimerIsSet = true;
        },
        
        updateTargets: function() {
            for (var i = this.activeTimerTargets.length - 1; i >= 0; i--) {
                this.configureCountdown(this.activeTimerTargets[i]);
            }
        },
        
        populateLayout: function(target, instance) {
            instance.options.layout = "";
            
            this.buildLayout(instance);
            this.writeTimeToDom(target, instance);
        },
        
        buildLayout: function(instance) {
            for (i = 0; i < instance.options.layoutChunks.length; i++) {
                instance.options.layout += instance.options.layoutChunks[i][1];
            }
        },
        
        writeTimeToDom: function(target, instance) {
            $(target).html(instance.options.layout);
        },
        
        // in case needed later    
        destroyCountdown: function(target) {
            var $target = $(target);
            
            if (!$target.hasClass(this.markerClassName)) {
                return;
            }
            
            this.removeTarget(target);
            $target.removeClass(this.markerClassName).empty();
            $.removeData(target, 'countdown');
        }
        
    });    // end $.extend()
    
    // singleton instance
    $.countdown = new Countdown();
    
    // add to jQuery function array
    $.fn.countdown = function(options) {
        $.countdown.initCountdown(this, options || {});
    };

})(jQuery);
