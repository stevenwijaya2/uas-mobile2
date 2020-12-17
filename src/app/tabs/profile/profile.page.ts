import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {AngularFireStorage} from '@angular/fire/storage';
import {AngularFireDatabase} from '@angular/fire/database';
import {Router} from '@angular/router';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ActionSheetController, AlertController, LoadingController, Platform, ToastController} from '@ionic/angular';
import {Camera, CameraResultType, CameraSource, Capacitor} from '@capacitor/core';
import {finalize} from 'rxjs/operators';
import {AuthService} from '../../auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  private id: string;
  private locId: any[] = [];
  private userData: any;
  private userLocations: any[] = [];
  private isDesktop: boolean;
  private downloadURL: any;
  private imageFile: any;
  private base64Image: any;
  private isCamera: boolean = null;
  private imageUrl: SafeResourceUrl;
  @ViewChild('filePicker', { static: false }) filePickerRef: ElementRef<HTMLInputElement>;

  constructor(
      private authService: AuthService,
      private db: AngularFireDatabase,
      private storage: AngularFireStorage,
      private router: Router,
      private platform: Platform,
      private sanitizer: DomSanitizer,
      private alertCtrl: AlertController,
      private loadingCtrl: LoadingController,
      private toastCtrl: ToastController,
      private actionSheetCtrl: ActionSheetController,
  ) { }

  ngOnInit() {
    if ((this.platform.is('mobile') && this.platform.is('hybrid')) || this.platform.is('desktop')){
      this.isDesktop = true;
    }
    this.authService.userDetails().subscribe(res => {
      if (res !== null){
        this.id = res.uid;
        this.getUserData();
      }
    }, err => {
      console.log(err);
    });
  }

  getUserLocation(){
    this.userLocations = [];
    this.locId = [];
    this.db.object('Location/' + this.id).query.once('value').then( res => {
      res.forEach(i => {
        this.userLocations.push(i.val());
        this.locId.push(i.ref.key);
      });
      this.userLocations.reverse();
      this.locId.reverse();
    });
  }

  getUserData(){
    this.db.object('Users/' + this.id).valueChanges().subscribe(res => {
      this.userData = res;
      if (this.userData.imageUrl){
        this.imageUrl = this.userData.imageUrl;
      }
      if (this.userData.locations){
        this.getUserLocation();
      }
    });
  }

  async getPicture(type: string){
    if (!Capacitor.isPluginAvailable('Camera') || (this.isDesktop && type === 'gallery')){
      this.filePickerRef.nativeElement.click();
      return;
    }

    const image = await Camera.getPhoto({
      quality: 100,
      width: 500,
      height: 500,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt
    });

    this.imageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(image && ('data:image/png;base64,' + image.base64String));
    this.isCamera = true;
    this.base64Image = image.base64String;

    this.uploadImage();
  }

  onFileChoose(event){
    const file = event.target.files[0];
    const pattern = /image-*/;
    const reader = new FileReader();

    if (!file.type.match(pattern)){
      this.imageFile = null;
      return;
    }

    reader.onload = () => {
      this.imageUrl = reader.result.toString();
    };
    reader.readAsDataURL(file);
    this.isCamera = false;
    this.imageFile = file;

    this.uploadImage();
  }

  async presentImageActionSheet(){
    const actionSheet = await this.actionSheetCtrl.create({
      animated: true,
      buttons: [
        {
          text: 'Take a picture',
          icon: 'camera-outline',
          handler: () => {
            this.getPicture('camera');
          }
        },
        {
          text: 'Pick from gallery',
          icon: 'image-outline',
          handler: () => {
            this.getPicture('gallery');
          }
        }]
    });

    await actionSheet.present();
  }

  uploadImage(){
    this.presentLoading().then(() => {
      const todayDate = Date.now();
      const filePath = `Profile/${todayDate}`;
      const fileRef = this.storage.ref(filePath);
      let uploadTask;
      if (this.isCamera){
        uploadTask = fileRef.putString(this.base64Image, 'base64', { contentType: 'image/png' });
      }
      else{
        uploadTask = this.storage.upload(`Profile/${todayDate}`, this.imageFile);
      }
      uploadTask.snapshotChanges()
          .pipe(
              finalize(() => {
                fileRef.getDownloadURL().subscribe(url => {
                  if (url) {
                    this.downloadURL = url;
                    this.userData.imageUrl = this.downloadURL;
                    const refPath = 'Users/' + this.id;
                    this.db.database.ref(refPath).update({
                      imageUrl: this.userData.imageUrl,
                    });
                  }
                });
              })
          ).subscribe();
      this.getUserData();
      const msg = 'You look so good, we success to upload your picture to our database';
      const clr = 'success';
      this.presentToast(msg, clr);
    });
  }

  imageLoaded(){
    setTimeout(() => {
      const PPictureWidth = document.getElementById('profilePicture').offsetWidth;
      document.getElementById('profilePicture').style.height = PPictureWidth + 'px';
    }, 10);
  }

  onLogout(){
    this.authService.signOut()
        .then(res => {
          this.router.navigateByUrl('/login');
        }).catch(error => {
      console.log(error);
    });
  }

  onPress(index) {
    this.presentAlert(index);
  }

  deleteLocationHistory(index){
    this.presentLoading().then(() => {
      if (index > -1) {
        this.db.list('Location/' + this.id + '/' + this.locId[index]).remove();
      }
      this.getUserLocation();
      const msg = 'We Success to delete your location from history';
      const clr = 'success';
      this.presentToast(msg, clr);
    });
  }

  async presentLoading(){
    const loading = await this.loadingCtrl.create({
      message: 'Processing...',
      duration: 5000
    });
    await loading.present();

    const {role, data} = await loading.onDidDismiss();
  }

  async presentToast(toastMsg: string, colorMsg: string) {
    const toast = await this.toastCtrl.create({
      message: toastMsg,
      duration: 3000,
      color: colorMsg,
    });
    await toast.present();
  }

  async presentAlert(idx){
    const alert = await this.alertCtrl.create({
      header: 'Delete selected Location',
      message: 'Are you really wanna delete this location from your history?',
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Yes',
          handler: () => this.deleteLocationHistory(idx)
        }
      ]
    });
    await alert.present();
  }
}

