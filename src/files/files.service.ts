// import { In, Repository } from 'typeorm';

// import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { InjectRepository } from '@nestjs/typeorm';

// // import { AWSService } from '../aws/aws.service';
// import { FILE_CONSTANTS, FileStatus } from 'src/shared/constants';
// import { File } from './entities/file.entity';

// @Injectable()
// export class FilesService {
//   constructor(
//     @InjectRepository(File)
//     private readonly fileRepository: Repository<File>,
//     private readonly configService: ConfigService,
//     // private readonly awsService: AWSService,
//   ) {}
//   async uploadFiles(files: Array<Express.Multer.File>) {
//     try {
//       if (!files || files.length == 0) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.MESSAGE_CODE.FILE_IS_REQUIRED,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }
//       // eslint-disable-next-line prefer-const
//       let data: any[] = [];
//       if (files) {
//         for await (const file of files) {
//           const aws = await this.uploadFile(file);
//           data.push(aws);
//         }
//       }
//       return { files: data };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async uploadFile(file: Express.Multer.File) {
//     try {
//       const uniqueSuffix = Math.round(Math.random() * 1e9);
//       const fileName = `files/${Date.now()}_${uniqueSuffix}.${
//         file.mimetype.split('/')[1]
//       }`;

//       // const upload: any = await this.awsService.uploadFile(file, fileName);

//       const fileData = {
//         // url: `${this.configService.get('AWS_CLOUDFRONT')}${upload.key}`,
//         // key: upload.key,
//         // path: upload.key,
//         originalName: file.originalname,
//         size: file.size,
//         fileType: file.mimetype,
//         userId: 1,
//       };

//       const data = await this.fileRepository.create(fileData);
//       await this.fileRepository.save(data);
//       return data;
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async deleteFile(fileId: number) {
//     try {
//       const file = await this.fileRepository.findOne({
//         where: {
//           id: fileId,
//           status: In([FileStatus.Active, FileStatus.Inactivate]),
//           // userId: id,
//         },
//       });

//       if (!file) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.MESSAGE_CODE.FILE_NOT_FOUND,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       await Promise.all([
//         this.fileRepository.update(file.id, {
//           status: FileStatus.Deleted,
//         }),
//         // this.awsService.deleteFile(file.key),
//       ]);

//       return { message: 'success' };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async checkFileAvailable(fileId: number) {
//     try {
//       const file = await this.fileRepository.findOne({
//         where: {
//           id: fileId,
//           status: In([FileStatus.Inactivate]),
//           // userId: userId,
//         },
//       });

//       if (!file) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.MESSAGE_CODE.FILE_NOT_FOUND,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       return { message: 'success' };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async activateFile(fileId: number) {
//     try {
//       const file = await this.fileRepository.findOne({
//         where: {
//           id: fileId,
//           status: In([FileStatus.Inactivate]),
//           //  userId: userId,
//         },
//       });

//       if (!file) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.MESSAGE_CODE.FILE_NOT_FOUND,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       // if (file.status === FileStatus.Active) {
//       //   return { message: 'success' };
//       // }

//       await this.fileRepository.update(file.id, {
//         status: FileStatus.Active,
//       });

//       return { message: 'success' };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async activateFileWithOutOwner(fileId: number) {
//     try {
//       const file = await this.fileRepository.findOne({
//         where: {
//           id: fileId,
//           status: In([FileStatus.Inactivate]),
//         },
//       });

//       if (!file) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.MESSAGE_CODE.FILE_NOT_FOUND,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       await this.fileRepository.update(file.id, {
//         status: FileStatus.Active,
//       });

//       return { message: 'success' };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async checkFileAvailableWithOutOwner(fileId: number) {
//     try {
//       const file = await this.fileRepository.findOne({
//         where: {
//           id: fileId,
//           status: In([FileStatus.Inactivate]),
//         },
//       });

//       if (!file) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.  MESSAGE_CODE.FILE_NOT_FOUND,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       return { message: 'success' };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async deleteFileWithOutOwner(fileId: number) {
//     try {
//       const file = await this.fileRepository.findOne({
//         where: {
//           id: fileId,
//           status: In([FileStatus.Active, FileStatus.Inactivate]),
//         },
//       });

//       if (!file) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.MESSAGE_CODE.FILE_NOT_FOUND,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       await Promise.all([
//         this.fileRepository.update(file.id, {
//           status: FileStatus.Deleted,
//         }),
//         // this.awsService.deleteFile(file.key),
//       ]);

//       return { message: 'success' };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }

//   async activationAndChangeOwner(fileId: number) {
//     try {
//       const file = await this.fileRepository.findOne({
//         where: {
//           id: fileId,
//           status: In([FileStatus.Active, FileStatus.Inactivate]),
//         },
//       });

//       if (!file) {
//         throw new HttpException(
//           {
//             messageCode: FILE_CONSTANTS.MESSAGE_CODE.FILE_NOT_FOUND,
//           },
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       await this.fileRepository.update(file.id, {
//         status: FileStatus.Active,
//         // userId: ownerId,
//       });

//       return { message: 'success' };
//     } catch (error) {
//       throw new HttpException(error, error.status);
//     }
//   }
// }
