export interface users{
    name : String;
    country: String; // e.g ng for Nigeria, cn for China
    id: number; // Sored as Bigint but used as String
}
export interface rooms{
    id: number, // Used as string
    messaging_status: 'diabled' | 'only-host' | 'only-holder';
}