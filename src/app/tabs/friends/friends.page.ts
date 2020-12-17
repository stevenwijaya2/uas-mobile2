import { Component, OnInit } from '@angular/core';
import {AlertController, LoadingController, ToastController} from '@ionic/angular';
import {AngularFireDatabase} from '@angular/fire/database';
import {Router} from '@angular/router';
import {AuthService} from '../../auth.service';

@Component({
  selector: 'app-friends',
  templateUrl: './friends.page.html',
  styleUrls: ['./friends.page.scss'],
})
export class FriendsPage implements OnInit {
  private searchedValue: string;
  private id: string;
  private userData: any;
  private friendId: any [] = [];
  private userFriendsData: any [] = [];
  private friendFriend: any [] = [];
  private userFilter: any;
  private loading: any;
  refPath: any;
  constructor(
      private authService: AuthService,
      public db: AngularFireDatabase,
      private router: Router,
      private toastCtrl: ToastController,
      private alertCtrl: AlertController,
      private loadingCtrl: LoadingController,
  ) { }

  ngOnInit() {

  }

  ionViewWillEnter(){
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

  findFriendsData(userId: string) {
    this.userFriendsData = [];
    this.friendId = [];
    this.db.database.ref('Users/' + userId + '/friends').once('value', data => {
      data.forEach(i => {
        this.db.object('Users/' + i.val()).query.once('value').then(
            res => {
              this.userFriendsData.push(res.val());
            }
        );
        this.friendId.push(i.val());
      });
    });
    this.userFilter = this.userFriendsData;
  }

  getFriendsData(){
    this.findFriendsData(this.id);
  }

  getUserData(){
    this.db.object(this.refPath).valueChanges().subscribe(data => {
      this.userData = data;
      this.userFriendsData = [];
      this.getFriendsData();
    });
  }

  searchFriends(){
    if (this.userFilter){
      if (this.searchedValue === ''){
        this.userFilter = this.userFriendsData;
      }
      else{
        this.filterFriendList();
      }
    }
  }

  filterFriendList(){
    this.userFilter = this.userFriendsData.filter(user => {
      return user.fullName.toLowerCase().includes(this.searchedValue.toLowerCase());
    });
  }

  async presentAlert(idx, friendsFullName){
    const alert = await this.alertCtrl.create({
      header: 'Unfriends',
      message: 'Are you sure want to remove ' + friendsFullName + ' from your Friend List?',
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Yes',
          handler: () => this.deleteFriends(idx)
        }
      ]
    });
    await alert.present();
  }

  async presentLoading(){
    this.loading = await this.loadingCtrl.create({
      message: 'Processing...',
    });
    await this.loading.present();
  }
  async presentToast(){
    const toast = await this.toastCtrl.create({
      message: 'Bye Bye Bitch...',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  deleteFriends(paramIndex){
    let index = 0;
    let index2: number;
    let counter1 = 0;
    let counter2: number;
    if (paramIndex > -1) {
      this.presentLoading().then(async () => {
        const friendID = this.friendId[paramIndex];
        this.userData.friends.forEach(i => {
          if (friendID === i){
            index2 = index;
          }
          index++;
        });
        this.friendFriend = this.userFriendsData[index2].friends;
        this.friendId.splice(paramIndex, 1);

        this.userData.friends = this.friendId;
        const refPath = 'Users/' + this.id;
        await this.db.database.ref(refPath).update({
          friends: this.userData.friends,
        });
        if (this.friendFriend.length > 1){
          this.friendFriend.forEach(i => {
            if (i === this.id){
              counter2 = counter1;
            }
            counter1++;
          });
        }
        this.friendFriend.splice(counter2, 1);

        const refPath2 = 'Users/' + friendID;
        await this.db.database.ref(refPath2).update({
          friends: this.friendFriend,
        });

        this.getFriendsData();
        await this.presentToast();
        this.loading.dismiss();
      });
    }
  }

  onPress(index, friendsFullName){
    this.presentAlert(index, friendsFullName);
  }

  imageLoaded(event){
    const target = event.target || event.srcElement || event.currentTarget;
    const idAttr = target.attributes.id;
    const idValue = idAttr.nodeValue;
    const profileWidth = document.getElementById(idValue).offsetWidth;
    document.getElementById(idValue).style.height = profileWidth + 'px';
  }
  goToAdd(){
    return this.router.navigate(['/tabs/friends/add']);
  }
}

