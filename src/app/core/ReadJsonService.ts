import { HttpClient } from '@angular/common/http'; 
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class ReadJsonService {

   constructor(private http: HttpClient) {}

    public getJSON(path: string): Observable<any> {
        return this.http.get(path);
    }

    public async readJsonFromFile(path: string): Promise<string> {
        var data2: string = await Promise.resolve(this.getJSON(path).toPromise());
        return data2;
    }
}