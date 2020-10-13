import { Movie } from './../interfaces/movies.interface'
import { Injectable } from '@angular/core'
import { map } from 'rxjs/operators'
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/firestore'
import { AngularFireAuth } from '@angular/fire/auth'
import * as firebase from 'firebase/app'
import Axios from 'axios'
import { BehaviorSubject } from 'rxjs'
import { environment } from './../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  public userLoggedIn: any = {}
  public iUser: any = {}
  private backendUserResponse = false
  public subjectProducts = new BehaviorSubject(null)
  public token = new BehaviorSubject('')
  public loading = false
  public error = []
  public dataMovie = new BehaviorSubject(undefined)
  private httpOptions = {}
  private response: any
  public itemsCollection: AngularFirestoreCollection<Movie>
  public movies: Movie[] = []

  constructor (
    private http: HttpClient,
    private afs: AngularFirestore,
    public afAuth: AngularFireAuth
  ) {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        Object.assign(this.iUser, user)
        console.log('uuuuuser', this.iUser)
      } else {
        return
      }
      this.userLoggedIn.name = user.displayName
      this.userLoggedIn.uId = user.uid
      this.userLoggedIn.image = user.photoURL
      this.loadMovies()
      // this.itemsCollection = this.afs.collection<Movie>("movies");
    })
  }

  set subjectDataProducts (value) {
    this.subjectProducts.next(value)
  }

  get subjectDataProducts () {
    return this.subjectProducts.getValue()
  }

  set subjectDataMovie (value) {
    this.dataMovie.next(value)
  }

  get subjectDataMovie () {
    return this.dataMovie.getValue()
  }

  login (provider?: string) {
    if (provider === 'google') {
      this.afAuth.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    }
    if (provider === 'twitter') {
      this.afAuth.auth.signInWithPopup(new firebase.auth.TwitterAuthProvider())
    }
  }

  logout () {
    this.subjectProducts.next(null)
    this.userLoggedIn = {}
    this.afAuth.auth.signOut()
  }

  async fetchMovie (input: string) {
    this.error = []
    this.httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }
    // http://www.omdbapi.com/?t=SEARCH_TEXT&apikey=API_KEY
    if (!input) return
    const { moviesApi } = environment
    let { apiUrl } = moviesApi
    const urlToFetch = apiUrl
      .replace('SEARCH_TEXT', input)
      .replace('API_KEY', moviesApi.apiKey)
    this.loading = true
    const response = await Axios.get(urlToFetch)
    console.log(response)
    // .then();
    /* this.http.get(urlToFetch, this.httpOptions).subscribe((search) => {
      console.log("search", search);
      if (search) this.response = search;
    }); */
    const { data, status, statusText } = response
    this.loading = false
    if (data && data.Error) this.error.push({ message: data.Error })
    console.log('data', this.error)
    // save the dataResponse to firebase // pending
    console.log('response', data)
    let sData = []
    sData.push(data)
    this.dataMovie.next(sData)
    // return { data: sData, status, statusText, Response, Error };
  }

  async addMovie (movie?: any) {
    if (this.error && this.error.length > 0) return
    let item = this.subjectDataMovie && (await this.subjectDataMovie[0])
    if (item) {
      item.createdAt = new Date()
      console.log('ddd', item)
      // await this.itemsCollection.add(item);
      this.itemsCollection.add(item).then(res => {
        // console.log(res);
      })
    } else {
      console.log('no movie received')
    }
  }

  async loadMovies () {
    this.itemsCollection = this.afs.collection<Movie>('movies', ref =>
      ref.orderBy('createdAt', 'desc')
    )
    return this.itemsCollection.valueChanges().pipe(
      map((movies: Movie[]) => {
        // console.log(movies);
        this.movies = movies
        // console.log(this.movies);
        return this.movies
      })
    )
  }

  async fetchDataProducts () {
    const options = {
      headers: {
        Authorization: `Bearer ${this.token.getValue()}`,
        'Content-Type': 'application/json'
      }
    }
    let userRequest
    try {
      this.loading = true
      userRequest = await Axios.get(
        'http://localhost:3000/api/products',
        options
      )
      this.backendUserResponse = true
    } catch (e) {
      userRequest = null
      this.loading = false
    }
    this.loading = false
    return userRequest ? await userRequest.data : userRequest
  }
}
