import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {map} from 'rxjs/operators';
import {AlertController, ToastController} from '@ionic/angular';
import {Router} from '@angular/router';
import {DatePipe} from '@angular/common';
import {AngularFireDatabase} from '@angular/fire/database';
import {AuthService} from '../../auth.service';

declare var google: any;

@Component({
  selector: 'app-maps',
  templateUrl: './maps.page.html',
  styleUrls: ['./maps.page.scss'],
})
export class MapsPage implements OnInit {
  private id: string;
  private lat: number;
  private lng: number;
  private map: any;
  private userMarker: any;
  private locName: any;
  private newLat: any;
  private newLng: any;
  private userData: any;
  private userFriendsData: any;
  private userFriends: any[] = [];
  private userLocation: any[] = [];

  refPath: any;

  @ViewChild('map', {read: ElementRef, static: false}) mapRef: ElementRef;
  initPos: any = {
    lat: -6.256081,
    lng: 106.618755
  };

  constructor(
      private toastCtrl: ToastController,
      private authService: AuthService,
      public db: AngularFireDatabase,
      private router: Router,
      private alertCtrl: AlertController,
      private datePipe: DatePipe,
  ) { }

  ngOnInit() {

  }

  async ionViewWillEnter() {
    this.authService.userDetails().subscribe(res => {
      if (res !== null) {
        this.id = res.uid;
        this.refPath = 'Users/' + this.id;
        this.getUserData();
      }
    }, err => {
      this.router.navigateByUrl('/login');
    });
  }

  getUserData() {
    this.db.object(this.refPath).valueChanges().subscribe(data => {
      this.userData = data;
      if (this.userData.locations) {
        this.locName = this.userData.locations.locName;
        this.newLat = this.userData.locations.lat;
        this.newLng = this.userData.locations.lng;
        this.userFriends = [];
        this.getFriendsData();
        this.showMap(this.initPos);
        if (this.userFriends.length > 0) {
          this.markFriendsLocation();
        }
      }
    });
  }

  findFriendsData(userId: string) {
    this.db.database.ref('Users/' + userId + '/friends').once('value', data => {
      data.forEach(i => {
        this.db.object('Users/' + i.val()).query.once('value').then(
            res => {
              this.userFriendsData = res.val();
              this.markFriendsLocation();
          }
        );
      });
    });
  }


  getFriendsData(){
    this.findFriendsData(this.id);
  }

  markFriendsLocation(){
    if (this.userFriendsData.locations){
      const location = new google.maps.LatLng(this.userFriendsData.locations.lat, this.userFriendsData.locations.lng);
      const marker = new google.maps.Marker({
        position: location,
        map: this.map,
      });
      const username = this.userFriendsData.firstName + ' ' + this.userFriendsData.lastName;
      marker.info = new google.maps.InfoWindow({
        content: this.userFriendsData.fullName,
      });
      google.maps.event.addListener(marker, 'click', () => {
        marker.info.open(this.map, marker);
      });
    }
  }

  async presentToast(tm: string, cm: string) {
    const toast = await this.toastCtrl.create({
      message: tm,
      duration: 3000,
      color: cm,
    });
    await toast.present();
  }

    async presentLocationAlert() {
        const alert = await this.alertCtrl.create({
            header: 'What is this place called ? ',
            inputs: [
                {
                    name: 'newLocation',
                    type: 'text',
                    placeholder: 'Location Name'
                },
            ],
            buttons: [
                {
                  text: 'Cancel',
                  role: 'cancel'
                },
                {
                    text: 'Submit',
                    handler: data => this.checkIn(data.newLocation),
                }
            ]
        });
        await alert.present();
    }

  getCurrentLocation(){
    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition((position: Position) => {
        if (this.userMarker){
          this.userMarker.setMap(null);
        }

        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        this.lat = pos.lat;
        this.lng = pos.lng;

        this.userMarker = new google.maps.Marker({
          position: new google.maps.LatLng(this.lat, this.lng),
          map: this.map,

        });
        this.userMarker.info = new google.maps.InfoWindow({
          content: 'Your Location',
        });
        this.userMarker.info.open(this.map, this.userMarker);
        this.map.setCenter(pos);
      });
    }
  }

  showMap(pos: any){
    if (this.userData.locations){
      const location = new google.maps.LatLng(this.newLat, this.newLng);
      const options = {
        center: location,
        zoom: 13,
        disableDefaultUI: true
      };
      this.map = new google.maps.Map(this.mapRef.nativeElement, options);
      this.userMarker = new google.maps.Marker({
        position: options.center,
        map: this.map,
      });
      this.userMarker.info = new google.maps.InfoWindow({
        content: 'Your Location',
      });
      this.userMarker.info.open(this.map, this.userMarker);
      this.map.setCenter(this.userMarker.position);
    }else{
      const location = new google.maps.LatLng(pos.lat, pos.lng);
      const options = {
        center: location,
        zoom: 13,
        disableDefaultUI: true
      };
      this.map = new google.maps.Map(this.mapRef.nativeElement, options);
      this.userMarker = new google.maps.Marker({
        position: options.center,
        map: this.map,
      });
      this.userMarker.info = new google.maps.InfoWindow({
        content: 'Your Location',
      });
      this.userMarker.info.open(this.map, this.userMarker);
      this.map.setCenter(pos);
    }
    this.map.addListener('click', (mapsMouseEvent) => {
      if (this.userMarker){
        this.userMarker.setMap(null);
      }

      this.lat = mapsMouseEvent.latLng.toJSON().lat;
      this.lng = mapsMouseEvent.latLng.toJSON().lng;

      this.userMarker = new google.maps.Marker({
        position: mapsMouseEvent.latLng,
        map: this.map,
      });
    });
  }

  getCurrentDate(): string{
    const date = new Date();
    // tslint:disable-next-line:max-line-length
    const today: string = this.datePipe.transform(date, 'dd') + '-' + this.datePipe.transform(date, 'MM') + '-' + this.datePipe.transform(date, 'yyyy');
    return today;
  }

  getCurrentTime(): string{
    const currentDate = new Date();
    const time: string = currentDate.getHours() + ':' + currentDate.getMinutes();
    return time;
  }

  checkIn(name: string){
    const today = this.getCurrentDate();
    const time = this.getCurrentTime();
    const newLocation: any = {
      lat: this.lat,
      lng: this.lng,
      locName: name,
      date: today,
      time,
    };
    this.userLocation = newLocation;
    this.userData.locations = this.userLocation;

    const refPath = 'Location/' + this.id;
    this.db.database.ref(refPath).push({
      lat: this.lat,
      lng: this.lng,
      locName: name,
      date: today,
      time,
    });
    const refPath2 = 'Users/' + this.id + '/locations';
    this.db.database.ref(refPath2).update({
      lat: this.lat,
      lng: this.lng,
      locName: name,
      date: today,
      time,
    });
    const msg = 'Yeay !  Location Update Success';
    const clr = 'success';
    this.presentToast(msg, clr);
  }

}

