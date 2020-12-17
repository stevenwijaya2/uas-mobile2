import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {LoadingController, ToastController} from '@ionic/angular';
import {Router} from '@angular/router';
import {AuthService} from '../auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  id: string;

  constructor(
      private toastCtrl: ToastController,
      private loadingCtrl: LoadingController,
      private authService: AuthService,
      private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    this.registerForm = this.formBuilder.group({
      firstName: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      lastName: new FormControl(null, {
        updateOn: 'blur',
      }),
      email: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.email , Validators.required]
      }),
      password: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      confirmPassword: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      checkbox: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
    }, {validator: this.isMatching('password', 'confirmPassword')});
  }

  isMatching(pass1: string, pass2: string){
    return (group: FormGroup): {[key: string]: any} => {
      const password = group.controls[pass1];
      const rePassword = group.controls[pass2];
      if (password.value !== rePassword.value) {
        return {
          missMatch: true
        };
      }
    };
  }

  onRegister(){
    if (this.registerForm.valid) {
      if (!this.registerForm.value.lastName){
        this.registerForm.value.lastName = ' ';
      }
      this.authService.signUp(
          this.registerForm.value.firstName,
          this.registerForm.value.lastName,
          this.registerForm.value.email,
          this.registerForm.value.password)
          .then(
            res => {
        }, (err) => {
          console.log(err.message);
          this.authService.presentToast(err.message, 'danger');
        });
    }
    this.registerForm.reset();
  }
}
