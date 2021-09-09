router.get('/questions/seeownquestion/:id', isAuthenticated, async (req, res) => {

  const userAnswerQuestionID = [];
 
  const idparamsObjectTypeID = mongoose.Types.ObjectId(req.params.id);
  const queryMatch = { '_id': idparamsObjectTypeID };
  console.log(queryMatch);
  const question = await Question.aggregate([
    { $match: queryMatch },
    {
      $lookup: {
        from: "users",
        let: {"allanswerUser" : "$allanswerinfo.User"},
        pipeline: [
          { $match: { $expr: { $in: [ "$_id", "$$allanswerUser" ] } }},
          {$project: {"password" :0,  "date" :0}}
        ],
        as: "usersAnswered"
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        date: 1,
        user_question: 1,
        tags: 1,
        allanswerinfoVar: {
          $map: {
            input: '$usersAnswered',
            as: "ri",
            in: {
              $mergeObjects: [
                "$$ri",
                {
                  $arrayElemAt: [{ $filter: { input: "$allanswerinfo", cond: { $eq: ["$$this.User", "$$ri._id"] } } }, 0]
                }
              ]
            }
          },
        },
      },
    }
  ])



  console.log(JSON.stringify(question, null, 2));

  res.render('questions/see-own-question', { question })
});
