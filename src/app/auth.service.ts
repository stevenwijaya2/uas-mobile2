import { Injectable } from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {LoadingController, ToastController} from '@ionic/angular';
import {AngularFireDatabase} from '@angular/fire/database';
import {Router} from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  loading = null;

  constructor(
      public fireAuth: AngularFireAuth,
      public db: AngularFireDatabase,
      private router: Router,
      private loadingCtrl: LoadingController,
      private toastCtrl: ToastController,
  ) { }

  async signUp(fName, lName: string, email: string, password: string) {
    await this.presentLoading().then(() => {
      return new Promise<any>((resolve, reject) => {
        this.fireAuth.createUserWithEmailAndPassword(email, password)
            .then(
                async res => {
                  const path = 'Users/' + res.user.uid;
                  await this.db.object(path).set({
                    email,
                    firstName: fName,
                    lastName: lName,
                    fullName: fName + ' ' + lName,
                  });
                  const msg = 'Congratulations, your account has been successfully created';
                  const clr = 'success';
                  await this.presentToast(msg, clr);
                  this.loading.dismiss();
                  this.router.navigate(['/login']);
                },
                err => {
                  reject(err);
                  const msg = 'Something went wrong, please try again ';
                  const clr = 'danger';
                  this.presentToast(msg, clr);
                  this.loading.dismiss();
                }
            );
      });
    });
  }

  public async presentToast(toastMsg: string, toastClr: string) {
    const toast = await this.toastCtrl.create({
      message: toastMsg,
      duration: 2000,
      color: toastClr,
    });
    await toast.present();
  }

  private async presentLoading() {
    this.loading = await this.loadingCtrl.create({
      duration: 2000,
      message: 'Processing...',
    });
    await this.loading.present();
  }

  async signIn(email, password) {
    await this.presentLoading().then(() => {
      return new Promise<any>((resolve, reject) => {
        this.fireAuth.signInWithEmailAndPassword(email, password)
            .then(
                res => {
                  resolve(res);
                  const msg = 'Welcome! we are waiting for you ';
                  const clr = 'success';
                  this.presentToast(msg, clr);
                  this.loading.dismiss();
                  this.router.navigate(['/tabs/maps']);
                },
                err => {
                  reject(err);
                  const msg = 'Seem\'s like your email or password is incorrect, please check again';
                  const clr = 'danger';
                  this.presentToast(msg, clr);
                  this.loading.dismiss();
                }
            );
      });
    });
  }

  async signOut() {
    await this.presentLoading().then(() => {
      return new Promise((resolve, reject) => {
        if (this.fireAuth.currentUser) {
          this.fireAuth.signOut()
              .then(() => {
                resolve();
                const msg = 'We will really miss you';
                const clr = 'success';
                this.presentToast(msg, clr);
                this.loading.dismiss();
              })
              .catch((error) => {
                reject();
                const msg = 'Something went wrong. Please try again.';
                const color = 'danger';
                this.presentToast(msg, color);
              });
        }
      });
    });
  }

  userDetails() {
    return this.fireAuth.user;
  }
}
