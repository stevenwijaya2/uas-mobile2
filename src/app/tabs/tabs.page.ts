import { Component, OnInit } from '@angular/core';
import {Router} from '@angular/router';
import {AngularFireDatabase} from '@angular/fire/database';
import {LoadingController, ToastController} from '@ionic/angular';
import {DatePipe} from '@angular/common';
import {AuthService} from '../auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage implements OnInit {
  id: string;
  private userData: any;
  locName: string;
  newLat: any;
  newLng: any;
  userLocations = [];
  private getData = false;

  constructor(
      private router: Router,
      private authService: AuthService,
      public db: AngularFireDatabase,
      private loadingCtrl: LoadingController,
      private toastCtrl: ToastController,
      private datePipe: DatePipe,
  ) { }

  ngOnInit() {
    this.authService.userDetails().subscribe(res => {
      if (res !== null){
        this.id = res.uid;
        this.getUserDetails();
      }
      else{
        this.router.navigateByUrl('/login');
      }
    }, err => {
      console.log(err);
    });
  }

  getUserDetails(){
    this.db.object('/Users/' + this.id).valueChanges().subscribe(data => {
      this.userData = data;
      if (this.userData.locations){
        this.locName = this.userData.locations.locName;
        this.newLat = this.userData.locations.lat;
        this.newLng = this.userData.locations.lng;
      }
      if (this.getData === false){
        this.getData = true;
        this.autoIn();
      }
    });
  }

  getCurrentDate(): string{
    const currentDate = new Date();
    const todayDay = this.datePipe.transform(currentDate, 'dd');
    const todayMonth = this.datePipe.transform(currentDate, 'MM');
    const todayYear = this.datePipe.transform(currentDate, 'yyyy');
    const today: string = todayDay + '-' + todayMonth + '-' + todayYear;

    return today;
  }

  getCurrentTime(): string{
    const currentDate = new Date();
    const todayHour = currentDate.getHours();
    const todayMinute = currentDate.getMinutes();
    const time: string = todayHour + ':' + todayMinute;
    return time;
  }

  autoIn(){
    this.presentLoading().then(() => {
      if (navigator.geolocation){
        navigator.geolocation.getCurrentPosition(async (position: Position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          if (!this.locName){
            this.locName = 'UMN';
          }
          const lat = pos.lat;
          const lng = pos.lng;

          const today = this.getCurrentDate();
          const time = this.getCurrentTime();
          // console.log(this.userLocations.locName);
          const newLocation: any = {
            lat,
            lng,
            locName: this.locName,
            date: today,
            time,
          };
          this.userLocations = newLocation;
          this.userData.locations = this.userLocations;

          const refPath = 'Location/' + this.id;
          this.db.database.ref(refPath).push({
            lat,
            lng,
            locName: this.locName,
            date: today,
            time,
          });

          const refPath2 = 'Users/' + this.id;
          this.db.database.ref(refPath2 + '/locations').set({
            lat,
            lng,
            locName: this.locName,
            date: today,
            time,
          });

          await new Promise(resolve => setTimeout(() => resolve(), (1 * 1000 * 60 * 10 ) )).then( () => {
            this.autoIn();
          });
        });
      }
    });
  }

  async presentLoading(){
    const loading = await this.loadingCtrl.create({
      message: 'Processing...',
      duration: 2000
    });
    return loading.present();
  }

}
