export class LaneDepartureSnapshot {
	Latitude: number;
    Longitude: number;
    Distance: number = 0;
	Heading: number = 0;
	AveragedHeading: number = 0;
	AccumulativeDistance: number = 0;

	// section: LaneDepartureSnapshot | undefined = undefined;
    RefrenceHeading: number = 0;
	DistanceFromStartOfSection: number = 0;
	Theta: number = 0;
	LateralDistance: number = 0;
	AccumulativeLateralDistance: number = 0;
	AbsoluteLateralDistance: number = 0;
	AbsoluteAccumulativeLateralDistance: number = 0;
	Alarm: boolean = false;


    constructor(Latitude: number, Longitude: number) 
    {        
        this.Latitude = Latitude;
        this.Longitude = Longitude;
    }    
}
