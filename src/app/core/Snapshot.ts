export class Snapshot {
    constructor(Latitude: number, Longitude: number) 
    {
        this.GoogleLatitude = Latitude;
        this.GoogleLongitude = Longitude;
        
        this.Latitude = -1;
        this.Longitude = -1;
        this.IsManipulated = false;
        this.TimeStampAsString = "some time";
        this.Accuracy = 1;
    }

    GoogleLatitude: number;

    GoogleLongitude: number;

    Latitude: number;

    Longitude: number;

    IsManipulated: boolean;

    TimeStampAsString: string;

    Accuracy: number;
}

