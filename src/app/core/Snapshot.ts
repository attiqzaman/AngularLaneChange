export class Snapshot {
    constructor(Latitude: number, Longitude: number, snapshotNumber: number) 
    {
        this.GoogleLatitude = Latitude;
        this.GoogleLongitude = Longitude;
        
        this.Latitude = this.GoogleLatitude;
        this.Longitude = this.GoogleLongitude;
        this.IsManipulated = false;
        this.TimeStampAsString = "-1";
        this.Accuracy = 1;
        this.SnapshotNumber = snapshotNumber;
    }

    GoogleLatitude: number;

    GoogleLongitude: number;

    Latitude: number;

    Longitude: number;

    IsManipulated: boolean;

    TimeStampAsString: string;

    Accuracy: number;

    SnapshotNumber: number;
}

