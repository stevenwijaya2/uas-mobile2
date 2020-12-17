import { Component, OnInit } from '@angular/core';
import {LoadingController, ToastController} from '@ionic/angular';
import {map} from 'rxjs/operators';
import {AngularFireDatabase} from '@angular/fire/database';
import {AuthService} from '../../../auth.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
})
export class AddPage implements OnInit {
  private searchValue: string;
  private id: string;
  private userData: any;
  private friendsData: any;
  refPath: any;
  private friendsId: any;
  private userFriends: any[] = [];
  private friendFriends: any[] = [];
  private searchedUserData: any = {};
  private userFound = false;
  private isFriend = false;
  private loading: any = null;

  constructor(
      private authService: AuthService,
      public db: AngularFireDatabase,
      private toastCtrl: ToastController,
      private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.authService.userDetails().subscribe(res => {
      if (res !== null){
        this.id = res.uid;
        this.refPath = 'Users/' + this.id;
        this.getUserData();
      }
    }, err => {
      console.log(err);
    });
  }

  getUserData(){
    this.db.object(this.refPath).valueChanges().subscribe(res => {
      this.userData = res;
      this.getUsersData();
    });
  }

  getUsersData(){
    if (this.userData.friends){
      this.userFriends = this.userData.friends;
    }else{
      this.userFriends = [];
    }
  }

  async searchUser() {
    await this.presentLoading().then(() => {
      if (this.searchValue !== '') {
        this.getSearchedUser(this.searchValue);
      }
    });
  }

  getSearchedUser(searchEmail: string) {
    this.isFriend = false;
    this.db.database.ref('Users').once('value', (res) => {
      res.forEach(i => {
        if (i.val().email === searchEmail) {
          this.searchedUserData = i.val();
          this.friendsId = i.ref.key;
        }
      });
      if (this.searchedUserData.email !== searchEmail){
        this.searchedUserData = {};
        this.userFound = false;
        const msg = 'Aw, we cant find your friends email :(';
        const clr = 'danger';
        this.presentToast(msg, clr);
      }else {
        this.userFound = true;
        if (this.userData.friends) {
          this.checkUserFriends();
        }
      }
    });
  }

  checkUserFriends(){
    this.userData.friends.forEach( i => {
      if (i === this.friendsId){
        this.isFriend = true;
      }
    });
  }

  async addFriend(){
    this.friendFriends = [];
    await this.presentLoading().then(async () => {
      this.db.object('Users/' + this.friendsId + '/friends').query.once('value').then(async res => {
        res.forEach(i => {
          this.friendFriends.push(i.val());
        });
        this.friendFriends.push(this.id);
        this.db.object('Users/' + this.friendsId).valueChanges().subscribe(async res2 => {
          this.friendsData = res2;
          if (this.friendsData.friends){
            this.friendsData.friends = this.friendFriends;
            const refPath2 = 'Users/' + this.friendsId;
            await this.db.database.ref(refPath2).update({
              friends: this.friendsData.friends,
            });
          }else{
            const refPath2 = 'Users/' + this.friendsId;
            await this.db.database.ref(refPath2).update({
              friends: this.friendFriends,
            });
          }
          this.friendFriends = [];
        });
      });
      this.userFriends.push(this.friendsId);
      this.userData.friends = this.userFriends;
      const refPath = 'Users/' + this.id;
      await this.db.database.ref(refPath).update({
        friends: this.userData.friends,
      });
      this.isFriend = true;
      const msg = 'Now two of you become friends';
      const clr = 'success';
      this.presentToast(msg, clr);
    });
  }

  imageLoaded(event){
    const target = event.target || event.srcElement || event.currentTarget;
    const idAttr = target.attributes.id;
    const idValue = idAttr.nodeValue;
    const profileWidth = document.getElementById(idValue).offsetWidth;
    document.getElementById(idValue).style.height = profileWidth + 'px';
  }

  async presentToast(toastMsg: string, toastClr: string) {
    const toast = await this.toastCtrl.create({
      message: toastMsg,
      duration: 3000,
      color: toastClr,
    });
    await toast.present();
  }

  async presentLoading(){
    const loading = await this.loadingCtrl.create({
      message: 'Processing...',
      duration: 3000
    });
    await loading.present();

    const {role, data} = await loading.onDidDismiss();
  }

}
